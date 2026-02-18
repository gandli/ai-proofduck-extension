import { TONE_MAP, DETAIL_MAP, BASE_CONSTRAINT, PROMPTS } from './prompts';
import { Settings } from './types';

export const LANG_MAP: Record<string, string> = {
    '中文': 'Chinese',
    'English': 'English',
    '日本語': 'Japanese',
    '한국어': 'Korean',
    'Français': 'French',
    'Deutsch': 'German',
    'Español': 'Spanish'
};

export function getSystemPrompt(mode: string, settings: Partial<Settings>) {
    const extensionLang = settings?.extensionLanguage || "中文";
    const targetLang = LANG_MAP[extensionLang] || extensionLang;

    const selectedTone = TONE_MAP[settings?.tone ?? 'professional'] || TONE_MAP.professional;
    const selectedDetail = DETAIL_MAP[settings?.detailLevel ?? 'standard'] || DETAIL_MAP.standard;

    let promptTemplate = PROMPTS[mode] || PROMPTS.proofread;
    promptTemplate = promptTemplate.replace(/{lang}/g, targetLang);
    promptTemplate = promptTemplate.replace("{tone}", selectedTone);
    promptTemplate = promptTemplate.replace("{detail}", selectedDetail);
    
    return `[System Directive]\n${promptTemplate}${BASE_CONSTRAINT}`;
}
