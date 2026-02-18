import { TONE_MAP, DETAIL_MAP, GLOBAL_GUIDE, PROMPTS, TINY_PROMPTS, SECURITY_CONSTRAINT } from './prompts';

export function formatUserPrompt(text: string): string {
    return `<user_input>\n${text.replace(/<\/user_input>/g, "")}\n</user_input>`;
}

export function isTinyModel(modelId: string): boolean {
    if (!modelId) return false;
    return modelId.includes("0.5B") || modelId.includes("1.5B") || modelId.includes("1B") || modelId.includes("2b") || modelId.includes("3B");
}

export function getSystemPrompt(mode: string, settings: any) {
    const targetLang = settings?.extensionLanguage || "中文";
    const modelId = settings?.localModel || "";
    
    // 判断是否为小模型（通常 3B 及以下）
    const tiny = isTinyModel(modelId);

    const selectedTone = TONE_MAP[settings?.tone] || TONE_MAP.professional;
    const selectedDetail = DETAIL_MAP[settings?.detailLevel] || DETAIL_MAP.standard;

    if (tiny) {
        // 小模型专用：极简模板
        let tinyTemplate = TINY_PROMPTS[mode] || TINY_PROMPTS.proofread;
        tinyTemplate = tinyTemplate.replace("{targetLang}", targetLang);
        return `${tinyTemplate}\n\n`;
    }

    // 标准模型：指令化模板
    let promptTemplate = PROMPTS[mode] || PROMPTS.proofread;

    // Replace placeholders
    promptTemplate = promptTemplate.replace("{tone}", selectedTone);
    promptTemplate = promptTemplate.replace("{detail}", selectedDetail);
    promptTemplate = promptTemplate.replace("{targetLang}", targetLang);

    // 极致简洁：指令句式 + 结果引导
    return `${promptTemplate}${GLOBAL_GUIDE}${SECURITY_CONSTRAINT}`;
}
