import { MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

export class WebLLMWorker {
    static engine: MLCEngine | null = null;
    static currentModel = "";
    static currentEngineType = "";

    static async getEngine(settings: any, onProgress?: (progress: InitProgressReport) => void) {
        const model = settings?.localModel || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
        const engineType = settings?.engine || "local-gpu";

        // Re-initialize if model or engine type changed
        if (this.engine && (this.currentModel !== model || this.currentEngineType !== engineType)) {
            console.log("[Worker] Settings changed, re-loading engine...");
            // WebLLM handles reloading internally with .reload(modelId)
        }

        if (!this.engine) {
            this.engine = new MLCEngine();
        }

        if (this.currentModel !== model || this.currentEngineType !== engineType) {
            this.currentModel = model;
            this.currentEngineType = engineType;

            if (onProgress) {
                this.engine.setInitProgressCallback(onProgress);
            }

            console.log(`[Worker] Loading WebLLM model: ${model} on ${engineType}`);
            // Note: engineType local-wasm can be hinted via appConfig if needed,
            // but MLCEngine usually auto-detects. Forcing wasm requires special config.
            await this.engine.reload(model);
        }

        return this.engine;
    }
}
