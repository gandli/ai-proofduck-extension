import { MODES, type ModeKey } from '../types';

interface ModeSelectorProps {
  mode: ModeKey;
  onChange: (mode: ModeKey) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="pd-fade-up grid grid-cols-5 gap-1.5 rounded-[1.2rem] bg-[#fff4ec] p-1.5 ring-1 ring-[#ffe3d5]">
      {MODES.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`rounded-[0.9rem] px-2 py-2 text-sm font-semibold transition duration-200 ${
            mode === item.key
              ? 'translate-y-[-1px] bg-white text-brand-orange shadow-[0_8px_20px_rgba(255,90,17,0.18)]'
              : 'bg-transparent text-slate-500 hover:scale-[1.02] hover:text-slate-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
