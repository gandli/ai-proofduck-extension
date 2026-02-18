import { MLCEngine, InitProgressReport, ChatCompletionMessageParam, prebuiltAppConfig } from "@mlc-ai/web-llm";
import { getSystemPrompt, formatUserPrompt, isTinyModel } from "./worker-utils";

class WebLLMWorker {
    static engine: MLCEngine | null = null;
    static currentModel = "";
    static currentEngineType = "";

    /**
     * 探测有效的 WASM URL
     * 因为 WebLLM 的 prebuilt 库命名规则经常变动 (如增加 ctx4k_cs1k, 改变 Instruct 位置等)
     * 通过 fetch HEAD 请求快速验证候选路径，确保下方的 Cache API 不会因为 404 而崩溃。
     */
    static async probeWasmUrl(model: string, modelLibBase: string, modelVersion: string): Promise<string> {
        const candidates: string[] = [];
        
        // 核心映射：处理特定型号到基础架构的匹配
        let baseName = model.replace(/-MLC$/, "");
        
        // DeepSeek Distill 系列通常映射给 Qwen2/Llama3
        if (baseName.includes("DeepSeek-R1-Distill-Qwen")) {
            const size = baseName.match(/(\d+(\.\d+)?B)/)?.[1] || "1.5B";
            baseName = `Qwen2-${size}-Instruct`;
        } else if (baseName.includes("DeepSeek-R1-Distill-Llama")) {
            const size = baseName.match(/(\d+(\.\d+)?B)/)?.[1] || "8B";
            baseName = `Llama-3-${size}-Instruct`;
        }

        // Qwen 系列转换
        if (baseName.includes("Qwen1.5") || baseName.includes("Qwen2.5")) {
            baseName = baseName.replace(/Qwen1\.5|Qwen2\.5/, "Qwen2");
        }
        if (baseName.includes("-Chat")) baseName = baseName.replace("-Chat", "-Instruct");
        
        // 提取量化信息 (如 q4f16_1)
        const quantMatch = model.match(/q\df\d+(_\d)?/);
        let quant = quantMatch ? quantMatch[0] : "q4f16_1";
        
        // 映射：q4f16_0 通常在 prebuilt 库中统一为 q4f16_1
        if (quant === "q4f16_0") quant = "q4f16_1";

        // 构造候选清单 (优先级从高到低)
        const cleanBase = baseName.split('-q')[0]; // 移除可能带有的量化尾缀
        
        // 候选 1: 标准现代命名 (ctx4k_cs1k)
        candidates.push(`${cleanBase}-${quant}-ctx4k_cs1k-webgpu.wasm`);
        // 候选 2: 基础命名 (无 ctx)
        candidates.push(`${cleanBase}-${quant}-webgpu.wasm`);
        // 候选 3: 如果没有 Instruct，尝试补全
        if (!cleanBase.includes("-Instruct")) {
            candidates.push(`${cleanBase}-Instruct-${quant}-ctx4k_cs1k-webgpu.wasm`);
        }
        // 候选 4: 原始型号直连 (保底)
        candidates.push(`${model}-webgpu.wasm`);

        console.log(`[Worker] Probing WASM candidates for ${model}...`);
        
        for (const wasmName of candidates) {
            const url = `${modelLibBase}/web-llm-models/${modelVersion}/${wasmName}`;
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    console.log(`[Worker] Found valid WASM: ${wasmName}`);
                    return url;
                }
            } catch (e) {
                // Ignore fetch errors during probe
            }
        }

        // 终极保底：返回最可能的默认路径
        return `${modelLibBase}/web-llm-models/${modelVersion}/${candidates[0]}`;
    }

    static async getEngine(settings: any, onProgress?: (progress: InitProgressReport) => void) {
        const model = settings?.localModel || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
        const engineType = settings?.engine || "local-gpu";

        // 构造动态 AppConfig
        const modelUrl = `https://huggingface.co/mlc-ai/${model}/resolve/main/`;
        const modelVersion = "v0_2_80"; 
        const modelLibBase = `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main`;
        
        // 智能探测真实的 libUrl
        const versionedLibUrl = await this.probeWasmUrl(model, modelLibBase, modelVersion);

        const appConfig = {
            model_list: [
                ...prebuiltAppConfig.model_list,
                {
                    model_id: model,
                    model: modelUrl,
                    model_lib: versionedLibUrl, 
                }
            ]
        };

        const isPrebuilt = prebuiltAppConfig.model_list.some((m: any) => m.model_id === model);
        
        if (!this.engine || this.currentModel !== model) {
            console.log(`[Worker] Initializing/Re-creating MLCEngine for: ${model}`);
            if (this.engine) {
                try {
                    await this.engine.unload();
                } catch (e) {
                    console.warn("[Worker] Engine unload failed (safe to ignore if first run):", e);
                }
            }
            this.engine = new MLCEngine({ appConfig });
        }

        if (this.currentModel !== model || this.currentEngineType !== engineType) {
            if (onProgress) {
                this.engine.setInitProgressCallback(onProgress);
            }

            console.log(`[Worker] Engine Reloading:
              - Model: ${model}
              - Lib: ${versionedLibUrl.split('/').pop()}`);

            try {
                await this.engine.reload(model, {
                    context_window_size: 8192,
                    appConfig: appConfig as any,
                });
                console.log(`[Worker] ${model} Ready.`);
                this.currentModel = model;
                this.currentEngineType = engineType;
            } catch (error: any) {
                console.error(`[Worker] Critical Load Error:`, error);
                
                // 针对 Cache.add 错误的友好提示
                if (error.message?.includes("Cache") || error.message?.includes("add")) {
                    throw new Error(`Load Error: Failed to cache model resources. This usually means the model library URL is incorrect or network is blocked. (Target: ${versionedLibUrl.split('/').pop()})`);
                }
                
                this.currentModel = "";
                this.currentEngineType = "";
                throw error;
            }
        }

        return this.engine;
    }
}

// Queue management for local inference
const localRequestQueue: { text: string; mode: string; settings: any }[] = [];
let isLocalProcessing = false;

async function processLocalQueue() {
    if (isLocalProcessing || localRequestQueue.length === 0) return;
    isLocalProcessing = true;

    while (localRequestQueue.length > 0) {
        const { text, mode, settings } = localRequestQueue.shift()!;
        let currentMode = mode || "proofread";
        try {
            console.log(`[Worker] Processing queued local task: ${currentMode}`);

            const systemPrompt = getSystemPrompt(currentMode, settings);
            // Skip XML wrapping for tiny models to avoid confusion, as they use simplified prompts
            const userContent = isTinyModel(settings.localModel) ? text : formatUserPrompt(text);

            const engine = await WebLLMWorker.getEngine(settings);
            const messages: ChatCompletionMessageParam[] = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
            ];

            const chunks = await engine.chat.completions.create({
                model: settings.localModel || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
                messages,
                stream: true,
            });

            let fullText = "";
            for await (const chunk of chunks) {
                const content = chunk.choices[0]?.delta?.content || "";
                fullText += content;
                self.postMessage({ type: "update", text: fullText, mode: currentMode });
            }
            console.log(`[Worker] Local Gen Complete. Mode: ${currentMode}`);
            self.postMessage({ type: "complete", text: fullText, mode: currentMode });
        } catch (error: any) {
            console.error("[Worker] Local Generate Error:", error);
            self.postMessage({ type: "error", error: error.message, mode: currentMode });
        }
    }

    isLocalProcessing = false;
}

async function handleGenerateOnline(text: string, mode: string, settings: any) {
    const currentMode = mode || "proofread";
    try {
        const systemPrompt = getSystemPrompt(currentMode, settings);
        const userContent = formatUserPrompt(text);

        if (!settings.apiKey) throw new Error("请在设置中配置 API Key");

        const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.apiModel,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ],
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        if (reader) {
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    if (trimmed.startsWith('data: ')) {
                        const dataStr = trimmed.slice(6).trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const json = JSON.parse(dataStr);
                            const content = json.choices[0]?.delta?.content || "";
                            fullText += content;
                            self.postMessage({ type: "update", text: fullText, mode: currentMode });
                        } catch (e) {
                            buffer = line + '\n' + buffer;
                        }
                    }
                }
            }
        }
        self.postMessage({ type: "complete", text: fullText, mode: currentMode });
    } catch (error: any) {
        console.error("[Worker] Online Error:", error);
        self.postMessage({ type: "error", error: error.message, mode: currentMode });
    }
}

self.onmessage = async (event: MessageEvent) => {
    const { type, text, settings, mode } = event.data;

    if (type === "load") {
        try {
            await WebLLMWorker.getEngine(settings, (progress) => {
                if (progress.text.includes('Fetching') || progress.text.includes('Loading')) {
                    let logText = progress.text;
                    // Attempt to append full URL if it's a "Fetching [file]" status
                    if (progress.text.startsWith('Fetching ')) {
                        const fileName = progress.text.replace('Fetching ', '').split(' ')[0];
                        const model = settings?.localModel || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
                        const fullUrl = `https://huggingface.co/mlc-ai/${model}/resolve/main/${fileName}`;
                        logText = `Fetching ${fileName} from ${fullUrl}`;
                    }
                    console.log(`[Worker] Model Init Progress: ${Math.round(progress.progress * 100)}% - ${logText}`);
                }
                self.postMessage({
                    type: "progress",
                    progress: { status: "progress", progress: progress.progress * 100, text: progress.text }
                });
            });
            self.postMessage({ type: "ready" });
        } catch (error: any) {
            self.postMessage({ type: "error", error: error.message });
        }
    } else if (type === "generate") {
        if (settings.engine === 'online') {
            handleGenerateOnline(text, mode, settings);
        } else {
            localRequestQueue.push({ text, mode, settings });
            processLocalQueue();
        }
    }
};
