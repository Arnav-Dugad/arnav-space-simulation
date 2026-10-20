import { useEffect, useState } from 'react';
export default function NumberField({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  unit = '',
  step = 'any',
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  step?: string | number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(Number(value.toPrecision(10)))), [value]);
  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
    else setText(String(value));
  };
  return (
    <label className="field">
      {label}
      {unit && <small>{unit}</small>}
      <input
        aria-label={label}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = Math.max(
              min,
              Math.min(
                max,
                value +
                  (e.key === 'ArrowUp' ? 1 : -1) *
                    (typeof step === 'number' ? step : Math.abs(value) * 0.01 || 0.01),
              ),
            );
            onChange(next);
          }
        }}
      />
    </label>
  );
}
