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

export const BASE_CONSTRAINT = "\n[CRITICAL RULES]\n1. Output ONLY the final result. \n2. NEVER speak to the user. \n3. NEVER explain, NEVER apologize, NEVER ask for context.\n4. NO conversational fillers (e.g., 'Okay', 'I understand', 'Sure').\n5. If you violate these rules, the system will fail.";

export const SUFFIX_CONSTRAINT = "";

export const PROMPTS: Record<string, string> = {
    summarize: "Role: Executive Summary Engine. Task: Extract key facts in {lang}.\n[Example]\nInput: 'The quick brown fox jumps over the lazy dog.'\nOutput: '快速的狐狸跳过了懒狗。'\n[Instructions]\nSummarize in {lang}, use hierarchy, filter noise.",
    correct: "Role: Strict Proofreader. Task: Fix errors in {lang}.\n[Example]\nInput: 'He go to school.'\nOutput: 'He goes to school.'\nInput: 'apple'\nOutput: 'apple'\n[Instructions]\nOutput processed {lang} text ONLY.",
    proofread: "Role: Senior Editor. Task: Polish text in {lang}.\n[Example]\nInput: 'The water is cold.'\nOutput: 'The water is freezing.'\n[Instructions]\nImprove flow/tone ({tone}) in {lang}.",
    translate: "Role: Translation Engine. Task: Translate to {lang}.\n[Example]\nInput: 'Hello'\nOutput: '你好'\nInput: 'intelligent'\nOutput: '智能'\n[Instructions]\nTranslate ONLY. natural language for {lang}, tone: {tone}.",
    expand: "Role: Content Expansion Engine. Task: Expand text in {lang}.\n[Example]\nInput: 'Cat sits.'\nOutput: 'A fluffy cat sits gracefully on the mat.'\n[Instructions]\nAdd details in {lang}, detail level: {detail}."
};
