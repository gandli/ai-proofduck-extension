/**
 * Engine Store - 引擎状态管理
 * 使用 Zustand 持久化用户引擎偏好
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EngineInfo, EngineStatus } from '@/types';

// Chrome storage adapter for Zustand persist
const chromeStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(name);
    const value = result[name];
    if (typeof value === 'string') {
      return value;
    }
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [name]: value });
  },
  removeItem: async (name: string): Promise<void> => {
    await chrome.storage.local.remove(name);
  },
};

/**
 * 引擎状态
 */
interface EngineState {
  // 当前选中的引擎ID
  selectedEngineId: string | null;

  // 引擎启用状态
  enabledEngines: Record<string, boolean>;

  // 引擎优先级
  enginePriorities: Record<string, number>;

  // 引擎信息缓存
  engineInfos: EngineInfo[];

  // 全局翻译设置
  sourceLang: string;
  targetLang: string;
  autoTranslate: boolean;
  bilingualMode: boolean;

  // 状态
  isTranslating: boolean;
  lastError: string | null;

  // Actions
  setSelectedEngine: (engineId: string | null) => void;
  setEngineEnabled: (engineId: string, enabled: boolean) => void;
  setEnginePriority: (engineId: string, priority: number) => void;
  setEngineInfos: (infos: EngineInfo[]) => void;
  updateEngineInfo: (engineId: string, info: Partial<EngineInfo>) => void;
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
  setAutoTranslate: (enabled: boolean) => void;
  setBilingualMode: (enabled: boolean) => void;
  setTranslating: (translating: boolean) => void;
  setLastError: (error: string | null) => void;
  reset: () => void;
}

/**
 * 默认引擎配置
 */
const defaultEngineConfig = {
  selectedEngineId: null,
  enabledEngines: {
    openai: true,
    google: true,
    // 其他引擎默认启用
  },
  enginePriorities: {
    openai: 10,
    google: 5,
  },
  engineInfos: [],
  sourceLang: 'auto',
  targetLang: 'zh',
  autoTranslate: false,
  bilingualMode: true,
  isTranslating: false,
  lastError: null,
};

export const useEngineStore = create<EngineState>()(
  persist(
    (set) => ({
      // Initial state
      ...defaultEngineConfig,

      // Actions
      setSelectedEngine: (engineId) => {
        set({ selectedEngineId: engineId });
      },

      setEngineEnabled: (engineId, enabled) => {
        set((state) => ({
          enabledEngines: {
            ...state.enabledEngines,
            [engineId]: enabled,
          },
        }));
      },

      setEnginePriority: (engineId, priority) => {
        set((state) => ({
          enginePriorities: {
            ...state.enginePriorities,
            [engineId]: priority,
          },
        }));
      },

      setEngineInfos: (infos) => {
        set({ engineInfos: infos });
      },

      updateEngineInfo: (engineId, info) => {
        set((state) => ({
          engineInfos: state.engineInfos.map((e) =>
            e.id === engineId ? { ...e, ...info } : e
          ),
        }));
      },

      setSourceLang: (lang) => {
        set({ sourceLang: lang });
      },

      setTargetLang: (lang) => {
        set({ targetLang: lang });
      },

      setAutoTranslate: (enabled) => {
        set({ autoTranslate: enabled });
      },

      setBilingualMode: (enabled) => {
        set({ bilingualMode: enabled });
      },

      setTranslating: (translating) => {
        set({ isTranslating: translating });
      },

      setLastError: (error) => {
        set({ lastError: error });
      },

      reset: () => {
        set(defaultEngineConfig);
      },
    }),
    {
      name: 'proofduck-engine',
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => ({
        selectedEngineId: state.selectedEngineId,
        enabledEngines: state.enabledEngines,
        enginePriorities: state.enginePriorities,
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        autoTranslate: state.autoTranslate,
        bilingualMode: state.bilingualMode,
      }),
    }
  )
);

/**
 * 获取当前选中的引擎是否启用
 */
export function isSelectedEngineEnabled(): boolean {
  const { selectedEngineId, enabledEngines } = useEngineStore.getState();
  if (!selectedEngineId) return true;
  return enabledEngines[selectedEngineId] ?? true;
}

/**
 * 获取引擎状态
 */
export function getEngineStatus(engineId: string): EngineStatus {
  const { engineInfos } = useEngineStore.getState();
  const info = engineInfos.find((e) => e.id === engineId);
  return info?.status ?? 'idle';
}