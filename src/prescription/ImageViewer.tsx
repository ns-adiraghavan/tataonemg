import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const MIN = 1;
const MAX = 6;
const STEP = 0.5;

/**
 * Zoomable scan viewer. Zoom 1 = whole page fits the pane. Buttons, Ctrl/⌘ + wheel,
 * double-click and drag-to-pan all work; "Open full size" hands over to the browser.
 */
export function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 }); // pane
  const [nat, setNat] = useState({ w: 0, h: 0 }); // image natural
  const [zoom, setZoom] = useState(1);
  const anchor = useRef<{ fx: number; fy: number; px: number; py: number } | null>(null); // focal point to keep fixed
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // image width at zoom 1 = largest size that still fits the whole page in the pane
  const aspect = nat.w && nat.h ? nat.w / nat.h : 0.75;
  const pad = 24;
  const baseW = Math.max(
    120,
    Math.min(size.w - pad, (size.h - pad) * aspect) || 0,
  );
  const imgW = baseW * zoom;

  const zoomTo = useCallback((next: number, clientX?: number, clientY?: number) => {
    const el = box.current;
    if (!el) return;
    const z = Math.min(MAX, Math.max(MIN, next));
    const r = el.getBoundingClientRect();
    const px = (clientX ?? r.left + r.width / 2) - r.left;
    const py = (clientY ?? r.top + r.height / 2) - r.top;
    // fraction of the scrollable content currently under the focal point
    anchor.current = {
      fx: (el.scrollLeft + px) / el.scrollWidth,
      fy: (el.scrollTop + py) / el.scrollHeight,
      px,
      py,
    };
    setZoom(z);
  }, []);

  // after the new size is laid out, put the focal point back under the cursor
  useLayoutEffect(() => {
    const el = box.current;
    const a = anchor.current;
    if (!el || !a) return;
    el.scrollLeft = a.fx * el.scrollWidth - a.px;
    el.scrollTop = a.fy * el.scrollHeight - a.py;
    anchor.current = null;
  }, [zoom]);

  // Ctrl/⌘ + wheel zooms (plain wheel keeps scrolling the pane / page)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoomTo(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, zoomTo]);

  const onDown = (e: React.PointerEvent) => {
    const el = box.current!;
    if (zoom === 1 && el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
    drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const el = box.current!;
    el.scrollLeft = d.sl - (e.clientX - d.x);
    el.scrollTop = d.st - (e.clientY - d.y);
  };
  const onUp = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div className="vw">
      <div className="vw-bar">
        <button onClick={() => zoomTo(zoom - STEP)} disabled={zoom <= MIN} aria-label="Zoom out">−</button>
        <span className="vw-pct">{Math.round(zoom * 100)}%</span>
        <button onClick={() => zoomTo(zoom + STEP)} disabled={zoom >= MAX} aria-label="Zoom in">+</button>
        <button className="txt" onClick={() => zoomTo(2.5)}>Zoom in</button>
        <button className="txt" onClick={() => zoomTo(1)} disabled={zoom === 1}>Fit page</button>
        <a className="txt" href={src} target="_blank" rel="noreferrer">Open full size ↗</a>
      </div>
      <div
        ref={box}
        className={`vw-pane${dragging ? " grabbing" : zoom > 1 ? " grab" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={(e) => zoomTo(zoom > 1 ? 1 : 2.5, e.clientX, e.clientY)}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ width: imgW || undefined }}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
      </div>
      <div className="vw-hint">Double-click or use + / − to zoom · drag to move · Ctrl/⌘ + scroll also zooms</div>
    </div>
  );
}
