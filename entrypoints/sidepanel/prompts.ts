export const TONE_MAP: Record<string, string> = {
  professional: "Professional, formal",
  casual: "Relaxed, conversational",
  academic: "Academic, rigorous",
  concise: "Extremely concise"
};

export const DETAIL_MAP: Record<string, string> = {
  standard: "Balanced detail",
  detailed: "Rich detail",
  creative: "Creative, literary"
};

export const BASE_CONSTRAINT =
  "[CRITICAL RULES]\n" +
  "1. Output ONLY the final result.\n" +
  "2. No explanations, no meta, no apologies.\n" +
  "3. No addressing the user.\n" +
  "4. No fillers.\n";

export const SUFFIX_CONSTRAINT = "";

export const PROMPTS: Record<string, string> = {
  summarize:
    "Task: Summarize the input in {lang}.\n" +
    "[Example]\n" +
    "Input: 'Artificial intelligence is changing the world by automating tasks.'\n" +
    "Output: 'AI通过自动化改变世界。'\n" +
    "[Instructions]\n" +
    "Summarize in {lang}. Extract facts, remove noise. Output ONLY the summary.",

  correct:
    "Task: Correct grammar and spelling in {lang}.\n" +
    "[Example]\n" +
    "Input: 'he go home'\n" +
    "Output: 'He goes home.'\n" +
    "[Instructions]\n" +
    "Correct errors in {lang}. If no errors, return original. Output ONLY the corrected text.",

  proofread:
    "Task: Polish and improve the text in {lang}.\n" +
    "[Example]\n" +
    "Input: 'The weather is bad.'\n" +
    "Output: 'The weather is extremely unpleasant today.'\n" +
    "[Instructions]\n" +
    "Improve clarity and flow ({tone}) in {lang}. Output ONLY the revised text.",

  translate:
    "Task: Translate carefully into {lang}.\n" +
    "[Example]\n" +
    "Input: 'Hello'\n" +
    "Output: '你好'\n" +
    "Input: 'Great job'\n" +
    "Output: '做得好'\n" +
    "[Instructions]\n" +
    "Translate accurately into {lang} with {tone} tone. Output ONLY the translation.",

  expand:
    "Task: Expand and enrich the text in {lang}.\n" +
    "[Example]\n" +
    "Input: 'Sun rises.'\n" +
    "Output: 'The bright sun rises majestically over the morning horizon.'\n" +
    "[Instructions]\n" +
    "Add details in {lang}. Level: {detail}. Output ONLY the expanded text."
};