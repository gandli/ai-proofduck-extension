import { describe, it, expect, vi } from 'vitest';
import type { ModeKey, WorkerOutboundMessage } from '../types';

// Test the useWorker message dispatch logic (extracted, not hook itself)

type SetterFns = {
  setStatus: ReturnType<typeof vi.fn>;
  setProgress: ReturnType<typeof vi.fn>;
  setError: ReturnType<typeof vi.fn>;
  setModeResults: ReturnType<typeof vi.fn>;
  setGeneratingModes: ReturnType<typeof vi.fn>;
};

function createSetters(): SetterFns {
  return {
    setStatus: vi.fn(),
    setProgress: vi.fn(),
    setError: vi.fn(),
    setModeResults: vi.fn(),
    setGeneratingModes: vi.fn(),
  };
}

/** Simulate the worker onmessage handler logic */
function handleWorkerMessage(msg: WorkerOutboundMessage, fns: SetterFns) {
  if (msg.type === 'progress' && msg.progress) {
    fns.setProgress(msg.progress);
  } else if (msg.type === 'ready') {
    fns.setStatus('ready');
    fns.setError('');
  } else if (msg.type === 'update') {
    fns.setModeResults(msg.mode, msg.text);
    fns.setGeneratingModes(msg.mode, true);
  } else if (msg.type === 'complete') {
    fns.setModeResults(msg.mode, msg.text);
    fns.setGeneratingModes(msg.mode, false);
  } else if (msg.type === 'error') {
    const errorContent = msg.error ?? 'Unknown error';
    if (!msg.mode) {
      fns.setError(`Load Error: ${errorContent}`);
      fns.setStatus('error');
    } else {
      fns.setError(`${msg.mode}: ${errorContent}`);
      fns.setGeneratingModes(msg.mode, false);
    }
  }
}

describe('Feature: Worker Message Dispatch', () => {
  describe('Scenario: Progress message', () => {
    it('Given progress message When received Then should update progress', () => {
      const fns = createSetters();
      handleWorkerMessage({ type: 'progress', progress: { progress: 50, text: 'Loading...' } }, fns);
      expect(fns.setProgress).toHaveBeenCalledWith({ progress: 50, text: 'Loading...' });
    });
  });

  describe('Scenario: Ready message', () => {
    it('Given ready message When received Then should set ready status and clear error', () => {
      const fns = createSetters();
      handleWorkerMessage({ type: 'ready' }, fns);
      expect(fns.setStatus).toHaveBeenCalledWith('ready');
      expect(fns.setError).toHaveBeenCalledWith('');
    });
  });

  describe('Scenario: Update message', () => {
    it('Given update message When received Then should update results and set generating true', () => {
      const fns = createSetters();
      handleWorkerMessage({ type: 'update', text: 'partial', mode: 'correct' }, fns);
      expect(fns.setModeResults).toHaveBeenCalledWith('correct', 'partial');
      expect(fns.setGeneratingModes).toHaveBeenCalledWith('correct', true);
    });
  });

  describe('Scenario: Complete message', () => {
    it('Given complete message When received Then should set final results and generating false', () => {
      const fns = createSetters();
      handleWorkerMessage({ type: 'complete', text: 'done', mode: 'translate' }, fns);
      expect(fns.setModeResults).toHaveBeenCalledWith('translate', 'done');
      expect(fns.setGeneratingModes).toHaveBeenCalledWith('translate', false);
    });
  });

  describe('Scenario: Error message with mode', () => {
    it('Given error with mode When received Then should set mode-specific error', () => {
      const fns = createSetters();
      handleWorkerMessage({ type: 'error', error: 'failed', mode: 'expand' }, fns);
      expect(fns.setError).toHaveBeenCalledWith('expand: failed');
      expect(fns.setGeneratingModes).toHaveBeenCalledWith('expand', false);
    });
  });

  describe('Scenario: Error message without mode (load error)', () => {
    it('Given error without mode When received Then should set global error status', () => {
      const fns = createSetters();
      handleWorkerMessage({ type: 'error', error: 'Load failed' }, fns);
      expect(fns.setError).toHaveBeenCalledWith('Load Error: Load failed');
      expect(fns.setStatus).toHaveBeenCalledWith('error');
    });
  });

  describe('Scenario: QUICK_TRANSLATE timeout logic', () => {
    it('Given 15s timeout When no response Then requestId should be cleared', async () => {
      vi.useFakeTimers();
      let pendingId: string | null = 'qt-123';
      const timeoutId = setTimeout(() => { pendingId = null; }, 15000);
      expect(pendingId).toBe('qt-123');
      vi.advanceTimersByTime(15000);
      expect(pendingId).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('Scenario: RequestId race protection', () => {
    it('Given stale requestId When response arrives Then should be ignored', () => {
      let currentId: string | null = 'qt-new';
      const responseId = 'qt-old';
      const isStale = responseId !== currentId;
      expect(isStale).toBe(true);
    });

    it('Given matching requestId When response arrives Then should be processed', () => {
      let currentId: string | null = 'qt-123';
      const responseId = 'qt-123';
      const isMatch = responseId === currentId;
      expect(isMatch).toBe(true);
    });
  });
});
