"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (value: number) => void;
};

function clamp(n: number) {
  return Math.min(10, Math.max(1, Math.round(n * 10) / 10));
}

export function RatingInput({ value, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-6xl font-light tabular-nums sm:text-7xl">
        {value.toFixed(1)}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(clamp(value - 1))}
          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium"
        >
          -1
        </button>
        <button
          onClick={() => onChange(clamp(value - 0.1))}
          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full"
          aria-label="نقص 0.1"
        >
          <Minus size={16} />
        </button>
        <input
          type="number"
          inputMode="decimal"
          step={0.1}
          min={1}
          max={10}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          className="liquid-glass w-20 rounded-full px-3 py-2 text-center tabular-nums focus:outline-none"
        />
        <button
          onClick={() => onChange(clamp(value + 0.1))}
          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full"
          aria-label="زيادة 0.1"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={() => onChange(clamp(value + 1))}
          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium"
        >
          +1
        </button>
      </div>
    </div>
  );
}
