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
    "Summarize the input in {lang}. Extract key facts, use clear structure, remove redundancy. Output only the summary.",

  correct:
    "Correct grammar and spelling in {lang}. If no errors, return the original text. Output only the corrected text.",

  proofread:
    "Polish the text in {lang}. Improve clarity and flow. Tone: {tone}. Output only the revised text.",

  translate:
    "Translate the input into {lang}. Natural, accurate, tone: {tone}. Output only the translation.",

  expand:
    "Expand the text in {lang}. Add relevant details. Detail level: {detail}. Output only the expanded text."
};