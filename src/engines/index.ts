// Engine adapters will be implemented in M2
export interface TranslationEngine {
  readonly id: string;
  readonly name: string;
  readonly category: 'translation' | 'local' | 'llm';
  readonly priority: number;
  readonly capabilities: {
    supportedLanguages: string[];
    maxTextLength: number;
  };

  checkAvailability(): Promise<boolean>;
  translate(text: string, from: string, to: string): Promise<TranslationResult>;
  stream?(text: string, from: string, to: string): AsyncGenerator<string>;
}

export interface TranslationResult {
  translatedText: string;
  engine: string;
  detectedLanguage?: string;
}