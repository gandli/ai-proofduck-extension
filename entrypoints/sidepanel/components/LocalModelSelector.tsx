import { useState, useRef, useEffect } from 'react';
import { Settings } from '../types';
import { SearchIcon, ChevronDownIcon } from './Icons';
import modelConfig from '../models.json';

interface Model {
  name: string;
  value: string;
  rawSize?: number;
}

interface Category {
  label: string;
  models: Model[];
}

interface ModelSelectorProps {
  settings: Settings;
  updateSettings: (s: Partial<Settings>, workerPostMessage?: (msg: unknown) => void) => void;
  postMessage: (msg: unknown) => void;
  status: string;
  t: Record<string, string>;
}

export function LocalModelSelector({ settings, updateSettings, postMessage, status, t }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = modelConfig.categories as Category[];

  // Filter categories and models based on search
  const filteredCategories = categories.map(cat => ({
    ...cat,
    models: cat.models.filter(m => 
      m.name.toLowerCase().includes(search.toLowerCase()) || 
      m.value.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.models.length > 0);

  useEffect(() => {
    if (isOpen && !selectedCategory && filteredCategories.length > 0) {
      setSelectedCategory(filteredCategories[0].label);
    }
  }, [isOpen, filteredCategories, selectedCategory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModel = categories.flatMap(c => c.models).find(m => m.value === settings.localModel);
  const isWarmed = (modelValue: string) => {
    const key = `${settings.engine}:${modelValue}`;
    return settings.readyConfigs?.includes(key);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm transition-all hover:bg-white hover:border-brand-orange focus:outline-none dark:bg-brand-dark-bg dark:border-[#4a4a6a] dark:text-slate-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate font-medium">
          {currentModel ? currentModel.name : t.model_label}
        </span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[1100] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-slideInDown dark:bg-[#1a1a2e] dark:border-slate-800">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input 
                autoFocus
                type="text" 
                placeholder={t.search_placeholder || "Search models..."} 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-orange/20 outline-none dark:bg-slate-800 dark:text-slate-200"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex h-[300px]">
            {/* Categories */}
            <div className="w-1/3 border-r border-slate-100 bg-slate-50/50 overflow-y-auto dark:border-slate-800 dark:bg-slate-900/30">
              {filteredCategories.map(cat => (
                <button
                  key={cat.label}
                  className={`w-full text-left px-4 py-3 text-[12px] font-bold uppercase transition-all ${selectedCategory === cat.label ? 'text-brand-orange bg-white dark:bg-[#252545]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  onClick={() => setSelectedCategory(cat.label)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Models */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredCategories.find(c => c.label === selectedCategory)?.models.map(m => {
                const warmed = isWarmed(m.value);
                return (
                  <button
                    key={m.value}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-all flex flex-col gap-1 ${settings.localModel === m.value ? 'bg-brand-orange/5 border border-brand-orange/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    onClick={() => {
                      updateSettings({ localModel: m.value }, postMessage);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[13px] font-medium leading-tight ${settings.localModel === m.value ? 'text-brand-orange' : 'text-slate-700 dark:text-slate-200'}`}>
                        {m.name}
                      </span>
                      {status === 'loading' && settings.localModel === m.value ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-[10px] font-bold text-brand-orange dark:bg-brand-orange/20 dark:text-brand-orange ring-1 ring-brand-orange/20 animate-pulse">
                          LOADING
                        </span>
                      ) : warmed ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-[10px] font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-green-600/20 animate-pulse">
                          READY
                        </span>
                      ) : settings.failedConfigs?.includes(`${settings.engine}:${m.value}`) ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-600/20">
                          FAILED
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
