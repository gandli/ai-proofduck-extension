export const TONE_MAP: Record<string, string> = {
    professional: "专业且正式",
    casual: "轻松且口语化",
    academic: "学术且严谨",
    concise: "极其简练"
};

export const DETAIL_MAP: Record<string, string> = {
    standard: "标准平衡",
    detailed: "丰富详尽",
    creative: "充满创意与文学性"
};

export const BASE_CONSTRAINT = "。绝对禁止输出任何引言、解释、前后缀、对照或 Markdown 代码块。禁言废话，禁言元描述。";

export const SUFFIX_CONSTRAINT = "\n\n【注意】：严禁废话，不准解释，只返回处理后的内容。";

export const PROMPTS: Record<string, string> = {
    summarize: "你是一个摘要提取工具。提取核心要点，保持客观简洁",
    correct: "你是一个文本校对助手。仅修复拼写、语法和标点错误，严禁改变原文风格",
    proofread: "你是一个文字润色编辑。提升文采，语气：{tone}",
    translate: "你是一个专业翻译官。准则：信、达、雅。语气：{tone}",
    expand: "你是一个内容扩写专家。丰富内容描述，详细度：{detail}"
};
