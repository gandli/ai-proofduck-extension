import { TONE_MAP, DETAIL_MAP, BASE_CONSTRAINT, SUFFIX_CONSTRAINT, PROMPTS } from './prompts';

export function getSystemPrompt(mode: string, settings: any) {
    const targetLang = settings?.extensionLanguage || "中文";

    const selectedTone = TONE_MAP[settings?.tone] || TONE_MAP.professional;
    const selectedDetail = DETAIL_MAP[settings?.detailLevel] || DETAIL_MAP.standard;

    const resultCommand = `直接且仅输出 ${targetLang} 结果文本：`;

    let promptTemplate = PROMPTS[mode] || PROMPTS.proofread;

    // Replace placeholders if they exist
    promptTemplate = promptTemplate.replace("{tone}", selectedTone);
    promptTemplate = promptTemplate.replace("{detail}", selectedDetail);

    return `${promptTemplate}${BASE_CONSTRAINT}${resultCommand}${SUFFIX_CONSTRAINT}`;
}

export class SSEParser {
    private buffer = "";

    /**
     * Processes a chunk of text and returns an array of complete message contents.
     * Handles buffering of incomplete lines.
     */
    process(chunk: string): string[] {
        this.buffer += chunk;
        const lines = this.buffer.split('\n');
        // Keep the last segment in the buffer as it might be incomplete
        this.buffer = lines.pop() || "";

        const results: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;

            try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                    results.push(content);
                }
            } catch (e) {
                // Log error but don't break the stream
                console.warn('Failed to parse SSE JSON:', e);
            }
        }

        return results;
    }
}
