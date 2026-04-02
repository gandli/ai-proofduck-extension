export async function probeWasmUrl(model: string, modelLibBase: string, modelVersion: string): Promise<string> {
    const candidates: string[] = [];
    let baseName = model.replace(/-MLC$/, "");

    if (baseName.includes("DeepSeek-R1-Distill-Qwen")) {
        const size = baseName.match(/(\d+(\.\d+)?B)/)?.[1] || "1.5B";
        baseName = `Qwen2-${size}-Instruct`;
    } else if (baseName.includes("DeepSeek-R1-Distill-Llama")) {
        const size = baseName.match(/(\d+(\.\d+)?B)/)?.[1] || "8B";
        baseName = `Llama-3-${size}-Instruct`;
    }

    if (baseName.includes("Qwen1.5") || baseName.includes("Qwen2.5")) {
        baseName = baseName.replace(/Qwen1\.5|Qwen2\.5/, "Qwen2");
    }
    if (baseName.includes("-Chat")) baseName = baseName.replace("-Chat", "-Instruct");

    const quantMatch = model.match(/q\df\d+(_\d)?/);
    let quant = quantMatch ? quantMatch[0] : "q4f16_1";
    if (quant === "q4f16_0") quant = "q4f16_1";

    const cleanBase = baseName.split('-q')[0];
    candidates.push(`${cleanBase}-${quant}-ctx4k_cs1k-webgpu.wasm`);
    candidates.push(`${cleanBase}-${quant}-webgpu.wasm`);
    if (!cleanBase.includes("-Instruct")) {
        candidates.push(`${cleanBase}-Instruct-${quant}-ctx4k_cs1k-webgpu.wasm`);
    }
    candidates.push(`${model}-webgpu.wasm`);

    console.log(`[Worker] Probing WASM candidates for ${model} concurrently...`);

    const fallbackUrl = `${modelLibBase}/web-llm-models/${modelVersion}/${candidates[0]}`;

    const probePromises = candidates.map(wasmName => {
        const url = `${modelLibBase}/web-llm-models/${modelVersion}/${wasmName}`;
        return new Promise<string>((resolve, reject) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            fetch(url, {
                method: 'HEAD',
                signal: controller.signal
            })
            .then(response => {
                clearTimeout(timeoutId);
                if (response.ok) {
                    console.log(`[Worker] Found valid WASM: ${wasmName}`);
                    resolve(url);
                } else {
                    reject(new Error(`HTTP ${response.status}`));
                }
            })
            .catch(e => {
                clearTimeout(timeoutId);
                reject(e);
            });
        });
    });

    try {
        const successfulUrl = await Promise.any(probePromises);
        return successfulUrl;
    } catch (e: unknown) {
        console.warn(`[Worker] All probes failed for ${model}, falling back to default.`);
        return fallbackUrl;
    }
}
