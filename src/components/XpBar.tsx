const SEGMENTS = 20;

/** Dolu kısmı parça parça gösterilen piksel ilerleme çubuğu. */
export function XpBar({ value, max, label }: { value: number; max: number; label: string }) {
  const filled = Math.floor((Math.min(value, max) / max) * SEGMENTS);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="grid h-3 gap-px bg-ink-soft p-px"
      style={{ gridTemplateColumns: `repeat(${SEGMENTS}, 1fr)` }}
    >
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={index < filled ? 'bg-amber' : 'bg-panel-high'}
          style={index === filled - 1 ? { background: '#ffe28a' } : undefined}
        />
      ))}
    </div>
  );
}
