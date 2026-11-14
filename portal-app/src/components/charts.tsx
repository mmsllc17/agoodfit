import { num } from '../lib';

function niceMax(v: number) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (const s of steps) if (s * p >= v) return s * p;
  return 10 * p;
}

/** Vertical bars with a hover title on each, labels under. */
export function BarChart({ data, label, format = num }: { data: { label: string; value: number }[]; label: string; format?: (n: number) => string }) {
  const W = 340;
  const H = 200;
  const left = 30;
  const base = 176;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const slot = (W - left) / Math.max(data.length, 1);
  const bw = Math.min(28, slot * 0.5);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={label}>
      {[0, 0.5, 1].map((f) => {
        const y = base - f * 160;
        return (
          <g key={f}>
            <line x1={left} x2={W} y1={y} y2={y} stroke="var(--line-soft)" />
            <text x={0} y={y + 4} fontSize="11" fill="var(--ink-faint)">
              {format(Math.round(max * f))}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * 160;
        const x = left + i * slot + (slot - bw) / 2;
        return (
          <g key={d.label} className="bar">
            <title>{`${d.label}: ${format(d.value)}`}</title>
            <rect x={x} y={base - h} width={bw} height={Math.max(h, 0)} rx="4" fill="var(--olive)" />
            <rect x={left + i * slot} y={0} width={slot} height={base} fill="transparent" />
            {(data.length <= 8 || i === data.length - 1 || (i % Math.ceil(data.length / 8) === 0 && data.length - 1 - i > Math.ceil(data.length / 8) / 2)) && (
              <text x={x + bw / 2} y={194} textAnchor="middle" fontSize="12" fill="var(--ink-muted)">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** A single-series line with dots and a label on the last point. */
export function LineChart({ data, label, lastLabel, format = num, fromZero = true }: { data: { label: string; value: number }[]; label: string; lastLabel?: string; format?: (n: number) => string; fromZero?: boolean }) {
  const W = 520;
  const H = 220;
  const left = 40;
  const right = 20;
  const top = 20;
  const base = 186;
  const hi = Math.max(...data.map((d) => d.value), 1);
  const lowest = Math.min(...data.map((d) => d.value));
  // When not starting at zero, frame the data so small changes are visible.
  const span = fromZero ? hi : niceMax(Math.max(hi - lowest, hi * 0.04) * 1.25);
  const lo = fromZero ? 0 : Math.max(0, Math.floor((hi - span * 0.9) / (span / 4)) * (span / 4));
  const max = fromZero ? niceMax(hi) : lo + span;
  const yOf = (v: number) => base - ((v - lo) / (max - lo || 1)) * (base - top);
  const step = data.length > 1 ? (W - left - right) / (data.length - 1) : 0;
  const pts = data.map((d, i) => [left + i * step + (data.length === 1 ? (W - left - right) / 2 : 0), yOf(d.value)] as const);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={label}>
      {[0, 0.5, 1].map((f) => {
        const y = base - f * (base - top);
        return (
          <g key={f}>
            <line x1={left} x2={W - right} y1={y} y2={y} stroke="var(--line-soft)" />
            <text x={0} y={y + 4} fontSize="11" fill="var(--ink-faint)">
              {format(Math.round(lo + (max - lo) * f))}
            </text>
          </g>
        );
      })}
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--olive)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const every = Math.max(1, Math.ceil(data.length / 7));
        const showLabel = i % every === 0 || i === data.length - 1;
        return (
          <g key={i}>
            <title>{`${data[i].label}: ${format(data[i].value)}`}</title>
            {data.length <= 16 ? <circle cx={p[0]} cy={p[1]} r="4.5" fill="var(--olive)" /> : <circle cx={p[0]} cy={p[1]} r="8" fill="transparent" />}
            {showLabel && (i === data.length - 1 || data.length - 1 - i > every / 2) && (
              <text x={p[0]} y={210} textAnchor="middle" fontSize="12" fill="var(--ink-muted)">
                {data[i].label}
              </text>
            )}
          </g>
        );
      })}
      {last && lastLabel && (
        <text x={last[0]} y={last[1] - 12} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--ink)">
          {lastLabel}
        </text>
      )}
    </svg>
  );
}

/** Labeled horizontal bars, e.g. neighborhoods by share. */
export function HBars({ rows, unit = '%' }: { rows: [string, number][]; unit?: string }) {
  const max = unit === '%' ? 100 : Math.max(...rows.map((r) => r[1]), 1);
  const scale = unit === '%' ? Math.max(...rows.map((r) => r[1]), 1) : max;
  return (
    <div className="hbars">
      {rows.map(([k, v]) => (
        <div className="hbars__row" key={k}>
          <span className="hbars__label">{k}</span>
          <span className="hbars__track">
            <span className="hbars__fill" style={{ width: `${(v / scale) * 100}%` }} />
          </span>
          <span className="hbars__value">
            {num(v)}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}
