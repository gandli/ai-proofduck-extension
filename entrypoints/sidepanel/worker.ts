import { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { getSystemPrompt } from "./worker-utils";
import { WebLLMWorker } from "./web-llm-worker";

// Queue management for local inference
export const localRequestQueue: { text: string; mode: string; settings: any }[] = [];
export let isLocalProcessing = false;

export const resetState = () => {
    localRequestQueue.length = 0;
    isLocalProcessing = false;
};

export async function processLocalQueue() {
    if (isLocalProcessing || localRequestQueue.length === 0) return;
    isLocalProcessing = true;

    while (localRequestQueue.length > 0) {
        const { text, mode, settings } = localRequestQueue.shift()!;
        let currentMode = mode || "proofread";
        try {
            console.log(`[Worker] Processing queued local task: ${currentMode}`);

            const systemPrompt = getSystemPrompt(currentMode, settings);
            const userContent = `【待处理文本】：\n${text}`;

            const engine = await WebLLMWorker.getEngine(settings);
            const messages: ChatCompletionMessageParam[] = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
            ];

            const chunks = await engine.chat.completions.create({
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
        const userContent = `【待处理文本】：\n${text}`;

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
