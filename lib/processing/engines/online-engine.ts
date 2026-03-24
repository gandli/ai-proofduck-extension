import type { ModeKey, Settings } from '../../../entrypoints/shared/contracts';

import { buildMessageList, extractAssistantText } from './prompting';

export interface OnlineExecutionInput {
  text: string;
  mode: ModeKey;
  settings: Settings;
}

export async function executeOnline(input: OnlineExecutionInput) {
  const response = await fetch(`${input.settings.onlineApiBase.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.settings.onlineApiKey}`,
    },
    body: JSON.stringify({
      model: input.settings.onlineModel,
      messages: buildMessageList(input.text, input.mode, input.settings),
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const result = extractAssistantText(data);

  if (!result) {
    throw new Error('empty response');
  }

  return {
    result,
    notice: '在线 API 已返回结果',
  };
}
