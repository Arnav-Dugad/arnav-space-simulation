import { useEffect, useId, useRef, useState } from 'react';
export default function Chart({
  values,
  label,
  color = '#a8cafa',
  height = 110,
}: {
  values: number[];
  label: string;
  color?: string;
  height?: number;
}) {
  const id = useId().replaceAll(':', '');
  const valid = values.filter(Number.isFinite),
    targetMin = valid.length ? Math.min(...valid) : 0,
    targetMax = valid.length ? Math.max(...valid) : 1;
  const [bounds, setBounds] = useState({ min: targetMin, max: targetMax }),
    current = useRef(bounds);
  useEffect(() => {
    const from = current.current;
    if (
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.querySelector('.app.reduced-motion')
    ) {
      const next = { min: targetMin, max: targetMax };
      current.current = next;
      setBounds(next);
      return;
    }
    let frame = 0;
    const start = performance.now();
    function update() {
      const t = Math.min(1, (performance.now() - start) / 280),
        ease = 1 - (1 - t) ** 3,
        next = {
          min: from.min + (targetMin - from.min) * ease,
          max: from.max + (targetMax - from.max) * ease,
        };
      current.current = next;
      setBounds(next);
      if (t < 1) frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [targetMin, targetMax]);
  const min = bounds.min,
    max = bounds.max,
    range = max - min || Math.abs(max) * 0.01 || 1;
  const points = valid
    .map(
      (v, i) =>
        `${10 + (i / Math.max(1, valid.length - 1)) * 580},${height - 16 - ((v - min) / range) * (height - 32)}`,
    )
    .join(' ');
  return (
    <div className="chart">
      <div className="chart-label">
        <span>{label}</span>
        <strong>
          {valid.length ? valid[valid.length - 1].toPrecision(5) : 'Awaiting samples'}
        </strong>
      </div>
      <svg
        viewBox={`0 0 600 ${height}`}
        role="img"
        aria-label={`${label} time series with ${valid.length} samples`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={id} x2="0" y2="1">
            <stop stopColor={color} stopOpacity=".2" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {valid.length > 1 && (
          <>
            <polygon points={`10,${height} ${points} 590,${height}`} fill={`url(#${id})`} />
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        <path d={`M10 ${height - 16} H590`} stroke="#293b55" strokeWidth=".5" />
      </svg>
    </div>
  );
}
