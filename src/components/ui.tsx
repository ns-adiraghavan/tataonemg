import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { FormulaDef } from "../types";

/* ── Info button + formula popover (feeds off formulas.json) ── */
export function Info({ def }: { def?: FormulaDef }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  if (!def) return null;
  return (
    <span className="info-wrap" ref={ref}>
      <button
        className="infobtn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`How ${def.label} is calculated`}
        title="How this is calculated"
      >
        i
      </button>
      {open && (
        <span className="info-pop" onClick={(e) => e.stopPropagation()}>
          <div className="ip-label">{def.label}</div>
          <div className="ip-formula">{def.formula}</div>
          <p className="ip-detail">{def.detail}</p>
        </span>
      )}
    </span>
  );
}

export const CASE_COLORS: Record<string, string> = {
  Chronic: "#ff6f61",
  "Sub-acute": "#c8862f",
  Acute: "#5b7285",
  "Acute / Emergency": "#5b7285",
};
export const CAT_COLORS: Record<string, string> = {
  Medication: "#ff6f61",
  "Diagnostic Test": "#5b7285",
  "Non-Medication": "#c8862f",
};
export const RAMP = [
  "#ff6f61", "#ff8a72", "#ffa588", "#c8862f", "#5b7285", "#8aa0b0", "#1a8a5a", "#d94f42",
];

/* ── Horizontal bar list ── */
export function HBar({
  rows,
  max,
  two = false,
}: {
  rows: { lbl: string; val: number; color?: string }[];
  max?: number;
  two?: boolean;
}) {
  if (!rows.length) return <div className="empty">No data</div>;
  const top = max ?? Math.max(...rows.map((r) => r.val), 1);
  return (
    <div className={`hbar${two ? " two" : ""}`}>
      {rows.map((r, i) => (
        <div className="row" key={r.lbl + i}>
          <div className="lbl" title={r.lbl}>
            {r.lbl}
          </div>
          <div className="track">
            <div
              className="fill in"
              style={{ width: `${(r.val / top) * 100}%`, background: r.color || "var(--coral)" }}
            />
          </div>
          <div className="num">{r.val}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Donut (SVG) ── */
export function Donut({
  data,
  centerTop,
  centerSub,
}: {
  data: { name: string; value: number; color: string }[];
  centerTop: string | number;
  centerSub: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 54,
    C = 2 * Math.PI * R,
    sw = 16;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: 130, height: 130 }}>
        <svg width={130} height={130} viewBox="0 0 130 130">
          <g transform="rotate(-90 65 65)">
            {data.map((d, i) => {
              const frac = d.value / total;
              const dash = frac * C;
              const seg = (
                <circle
                  key={i}
                  cx={65}
                  cy={65}
                  r={R}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={sw}
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return seg;
            })}
          </g>
        </svg>
        <div className="mid">
          <b>{centerTop}</b>
          <small>{centerSub}</small>
        </div>
      </div>
      <div className="leg">
        {data.map((d, i) => (
          <div className="li" key={i}>
            <span className="sq" style={{ background: d.color }} />
            {d.name} <b>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Card({
  title,
  q,
  span2,
  info,
  children,
}: {
  title: string;
  q?: string;
  span2?: boolean;
  info?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`card${span2 ? " span2" : ""}`}>
      <h3>
        {title}
        {info}
      </h3>
      {q && <p className="q">{q}</p>}
      {children}
    </div>
  );
}
