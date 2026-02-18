import { TONE_MAP, DETAIL_MAP, BASE_CONSTRAINT, GLOBAL_GUIDE, PROMPTS, TINY_PROMPTS } from './prompts';
import { Settings, ModeKey } from './types';

export const LANG_MAP: Record<string, string> = {
    '中文': 'Chinese',
    'English': 'English',
    '日本語': 'Japanese',
    '한국어': 'Korean',
    'Français': 'French',
    'Deutsch': 'German',
    'Español': 'Spanish'
};

export function getSystemPrompt(mode: ModeKey, settings: Partial<Settings>) {
    const extensionLang = settings?.extensionLanguage || "中文";
    const targetLang = LANG_MAP[extensionLang] || extensionLang;
    const modelId = settings?.localModel || "";
    
    // Determine if it's a tiny model (usually 3B and below)
    const isTinyModel = modelId.includes("0.5B") || 
                        modelId.includes("1.5B") || 
                        modelId.includes("1B") || 
                        modelId.includes("2b") || 
                        modelId.includes("3B");

    const selectedTone = TONE_MAP[settings?.tone ?? 'professional'] || TONE_MAP.professional;
    const selectedDetail = DETAIL_MAP[settings?.detailLevel ?? 'standard'] || DETAIL_MAP.standard;

    if (isTinyModel && settings.engine !== 'chrome-ai' && settings.engine !== 'online') {
        // Specialized minimal template for tiny models
        let tinyTemplate = TINY_PROMPTS[mode] || TINY_PROMPTS.proofread;
        tinyTemplate = tinyTemplate.replace("{lang}", targetLang);
        return `${tinyTemplate}${GLOBAL_GUIDE}`;
    }

    // Standard instruction-based template
    let promptTemplate = PROMPTS[mode] || PROMPTS.proofread;
    promptTemplate = promptTemplate.replace(/{lang}/g, targetLang);
    promptTemplate = promptTemplate.replace("{tone}", selectedTone);
    promptTemplate = promptTemplate.replace("{detail}", selectedDetail);
    
    return `[System Directive]\n${promptTemplate}\n${BASE_CONSTRAINT}`;
}
