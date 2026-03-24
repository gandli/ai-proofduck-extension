import { useEffect, useMemo, useState } from 'react';

import {
  RUNTIME_MESSAGES,
  STORAGE_KEYS,
  type EnginePreference,
  type InputDraft,
  type SelectionTranslationPayload,
} from '../shared/contracts';
import { ModeSelector } from './components/ModeSelector';
import { SettingsIcon } from './components/Icons';
import { ResultPanel } from './components/ResultPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useSettings } from './hooks/useSettings';
import { MODES, type ModeKey } from './types';

const PREFERENCE_LABELS: Record<EnginePreference, string> = {
  auto: '自动优先',
  'chrome-ai': '浏览器内置 AI',
  local: '本地模型',
  online: '在线 API',
};

const RESULT_TITLES: Record<ModeKey, string> = {
  translate: 'TRANSLATION',
  summarize: 'SUMMARY',
  correct: 'CORRECTION',
  proofread: 'POLISH',
  expand: 'EXPANSION',
};

export default function App() {
  const { settings, ready, updateSettings } = useSettings();
  const [mode, setMode] = useState<ModeKey>('translate');
  const [text, setText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState('');
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [engineNotice, setEngineNotice] = useState('');
  const [progressText, setProgressText] = useState('');
  const [pendingAutoRun, setPendingAutoRun] = useState(false);

  const applyDraft = (draft: InputDraft) => {
    setText(draft.text);
    if (draft.preferredMode) {
      setMode(draft.preferredMode);
    }

    if (draft.prefilledResult) {
      setResult(draft.prefilledResult);
      setProcessingStatus('done');
      setEngineNotice(draft.prefilledNotice ?? '');
      setProgressText('');
      setPendingAutoRun(false);
      return;
    }

    setResult('');
    setProcessingStatus('idle');
    setEngineNotice('');
    setProgressText('');
    setPendingAutoRun(Boolean(draft.autoRun));
  };

  useEffect(() => {
    browser.storage.local.get([STORAGE_KEYS.inputDraft, STORAGE_KEYS.selectionTranslation]).then((result) => {
      const draft = result[STORAGE_KEYS.inputDraft] as InputDraft | undefined;
      const translatedSelection = result[STORAGE_KEYS.selectionTranslation] as SelectionTranslationPayload | undefined;
      const initialDraft = draft?.text ? draft : translatedSelection?.draft;
      if (!initialDraft?.text) return;

      applyDraft(initialDraft);
      if (draft?.text) {
        void browser.storage.local.remove(STORAGE_KEYS.inputDraft);
      }
    });
  }, []);

  useEffect(() => {
    if (!ready || !pendingAutoRun || !normalizeInput(text)) {
      return;
    }

    setPendingAutoRun(false);
    void runProcessing();
  }, [pendingAutoRun, ready, text, mode, settings]);

  useEffect(() => {
    const listener = (message: { type?: string; payload?: SelectionTranslationPayload }) => {
      if (message?.type !== RUNTIME_MESSAGES.selectionTranslationUpdated || !message.payload?.draft?.text) {
        return undefined;
      }

      applyDraft(message.payload.draft);
      return undefined;
    };

    browser.runtime.onMessage.addListener(listener);
    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, [ready]);

  const currentMode = useMemo(() => MODES.find((item) => item.key === mode) ?? MODES[0], [mode]);
  const actionLabel = useMemo(() => {
    if (processingStatus === 'running') {
      return progressText || `正在${currentMode.label}`;
    }

    return `执行${currentMode.label}`;
  }, [currentMode.label, processingStatus, progressText]);

  const runProcessing = async () => {
    if (!normalizeInput(text)) return;

    setProcessingStatus('running');
    setProgressText('');
    setEngineNotice(`当前策略：${PREFERENCE_LABELS[settings.enginePreference]}`);

    try {
      const { executeProcessing } = await import('../../lib/processing/executeProcessing');
      const execution = await executeProcessing({
        text,
        mode,
        settings,
        onProgress(progress) {
          setProgressText(progress.message);
        },
      });

      setResult(execution.result);
      setProcessingStatus('done');
      setEngineNotice(execution.notice);
      setProgressText('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      setResult('');
      setProcessingStatus('error');
      setEngineNotice(`处理失败：${message}`);
      setProgressText('');
    }
  };

  const importSelection = async () => {
    const draft = (await browser.runtime.sendMessage({
      type: RUNTIME_MESSAGES.getSelection,
    })) as InputDraft | null;

    if (!draft?.text) return;

    setText(draft.text);
  };

  const importPage = async () => {
    const draft = (await browser.runtime.sendMessage({
      type: RUNTIME_MESSAGES.getPageText,
    })) as InputDraft | null;

    if (!draft?.text) return;

    setText(draft.text);
  };

  const clearInput = () => {
    setText('');
    setProcessingStatus('idle');
    setProgressText('');
    setEngineNotice('');
    setPendingAutoRun(false);
  };

  const clearResult = () => {
    setResult('');
    setProcessingStatus('idle');
    setProgressText('');
    setEngineNotice('');
    setPendingAutoRun(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#fffaf6] px-3 py-3 text-brand-ink">
      <div className="pd-fade-up mx-auto flex h-full max-w-3xl flex-col gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ModeSelector mode={mode} onChange={setMode} />
          </div>
          <button
            type="button"
            aria-label="设置"
            onClick={() => setShowSettings(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ffd9c8] bg-white text-[#cc470e] shadow-sm transition duration-200 hover:scale-[1.03] hover:border-brand-orange hover:bg-[#fff3eb] hover:text-brand-orange"
          >
            <SettingsIcon className="h-[17px] w-[17px]" />
          </button>
        </div>

        <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">SOURCE</h2>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={clearInput}
                  disabled={!text}
                  className="rounded-full border border-[#ffd9c8] bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
                >
                  清空
                </button>
                <button
                  type="button"
                  onClick={() => void importSelection()}
                  className="rounded-full border border-[#ffd9c8] bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-brand-orange hover:text-brand-orange"
                >
                  导入选区
                </button>
                <button
                  type="button"
                  onClick={() => void importPage()}
                  className="rounded-full border border-[#ffd9c8] bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-brand-orange hover:text-brand-orange"
                >
                  抓取正文
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setProcessingStatus('idle');
                setProgressText('');
              }}
              placeholder="在这里粘贴文本，或者直接从网页选区与整页正文带入内容。"
              className="min-h-[11rem] h-[33vh] max-h-[47vh] w-full resize-y overflow-auto rounded-[1.15rem] border border-[#e8eef6] bg-white p-3.5 text-sm leading-7 text-slate-600 outline-none transition duration-200 focus:border-brand-orange focus:shadow-[0_0_0_3px_rgba(255,90,17,0.08)]"
            />
          </div>

          <ResultPanel
            title={RESULT_TITLES[mode]}
            result={result}
            notice={processingStatus === 'done' && result ? engineNotice : ''}
            isLoading={processingStatus === 'running'}
            progressText={progressText}
            onClear={clearResult}
          />
        </section>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void runProcessing()}
            disabled={processingStatus === 'running'}
            className={`w-full rounded-[1rem] bg-brand-orange px-4 py-3 text-base font-bold text-white shadow-[0_16px_28px_rgba(255,90,17,0.24)] transition duration-200 hover:opacity-90 disabled:cursor-wait disabled:opacity-85 ${
              processingStatus === 'running' ? 'pd-soft-pulse' : ''
            }`}
          >
            {processingStatus === 'running' && !progressText ? `正在${currentMode.label}...` : actionLabel}
          </button>

          {processingStatus === 'error' ? <p className="text-xs leading-5 text-slate-500">{engineNotice}</p> : null}
        </div>
      </div>

      <SettingsPanel
        open={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onChange={updateSettings}
      />
    </div>
  );
}

function normalizeInput(value: string) {
  return value.trim();
}
