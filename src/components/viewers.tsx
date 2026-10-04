import React, { useRef, useState } from 'react';
import type { Region, RegionType, TriView } from '../types';
import { REGION_LABEL } from '../types';

export function MultiView({ views, tab, onTab }: { views: TriView; tab: 'front' | 'side' | 'back'; onTab: (t: 'front' | 'side' | 'back') => void }) {
  const tabs = [{ k: 'front', l: '앞' }, { k: 'side', l: '옆' }, { k: 'back', l: '뒤' }] as const;
  const src = tab === 'front' ? views.front : tab === 'side' ? views.side : views.back;
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => onTab(t.k)}
            className={`flex-1 min-h-[48px] rounded-xl font-semibold text-[16px] border ${tab === t.k ? 'bg-primary text-white border-primary' : 'bg-white border-line text-secondary'}`}>
            {t.l}
          </button>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden border border-line bg-softBg">
        <img key={src} src={src} alt={tab} className="w-full aspect-[4/4.4] object-cover ht-fade" draggable={false} />
      </div>
    </div>
  );
}

// Draggable + resizable region overlay (normalized 0~1 저장)
export interface LengthGuide {
  key: 'fringe' | 'side';
  /** 0~100. 사진 세로 기준 기장 위치. 위로 올리면 짧게, 내리면 길게. */
  y: number;
  color: string;
  title: string;
  display: string;
  onChange: (v: number) => void;
}

export function DraggableRegion({ image, region, onChange, guides }: { image: string; region: Region; onChange: (r: Region) => void; guides?: LengthGuide[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | { mode: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number }>(null);
  const [guideDrag, setGuideDrag] = useState<null | { key: string; startNy: number; origV: number; onChange: (v: number) => void }>(null);

  const toNorm = (clientX: number, clientY: number) => {
    const el = boxRef.current!.getBoundingClientRect();
    return { nx: (clientX - el.left) / el.width, ny: (clientY - el.top) / el.height };
  };
  const start = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.stopPropagation(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toNorm(e.clientX, e.clientY);
    setDrag({ mode, sx: p.nx, sy: p.ny, ox: region.x, oy: region.y, ow: region.w, oh: region.h });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toNorm(e.clientX, e.clientY);
    const dx = p.nx - drag.sx, dy = p.ny - drag.sy;
    if (drag.mode === 'move') {
      onChange({ ...region, x: Math.min(0.95, Math.max(0, drag.ox + dx)), y: Math.min(0.95, Math.max(0, drag.oy + dy)) });
    } else {
      onChange({ ...region, w: Math.min(0.95, Math.max(0.08, drag.ow + dx)), h: Math.min(0.95, Math.max(0.08, drag.oh + dy)) });
    }
  };
  const end = () => setDrag(null);

  const guideStart = (g: LengthGuide) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toNorm(e.clientX, e.clientY);
    setGuideDrag({ key: g.key, startNy: p.ny, origV: g.y, onChange: g.onChange });
  };
  const guideMove = (e: React.PointerEvent) => {
    if (!guideDrag) return;
    const p = toNorm(e.clientX, e.clientY);
    const dy = (p.ny - guideDrag.startNy) * 100;
    const next = Math.min(100, Math.max(0, Math.round(guideDrag.origV + dy)));
    guideDrag.onChange(next);
  };
  const guideEnd = () => setGuideDrag(null);

  return (
    <div ref={boxRef} className="relative rounded-2xl overflow-hidden border border-line bg-softBg select-none touch-none">
      <img src={image} alt="style" className="w-full aspect-[4/4.4] object-cover pointer-events-none" draggable={false} />
      <div
        onPointerDown={start('move')} onPointerMove={move} onPointerUp={end}
        className="absolute border-[3px] border-primary rounded-xl bg-primary/10 cursor-grab active:cursor-grabbing"
        style={{
          left: `${region.x * 100}%`, top: `${region.y * 100}%`,
          width: `${region.w * 100}%`, height: `${region.h * 100}%`,
          boxShadow: drag ? '0 10px 30px rgba(255,74,93,.35)' : '0 4px 14px rgba(0,0,0,.18)'
        }}>
        <span className="absolute -top-8 left-0 bg-primary text-white text-[13px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
          {region.label || REGION_LABEL[region.type as RegionType]}
        </span>
        <span
          onPointerDown={start('resize')}
          className="absolute -bottom-4 -right-4 w-11 h-11 min-w-[44px] min-h-[44px] bg-primary border-4 border-white rounded-full shadow-lg cursor-nwse-resize flex items-center justify-center text-white font-bold">⤡</span>
      </div>
      {(guides ?? []).map((g) => (
        <div key={g.key} className="absolute left-0 right-0 z-10" style={{ top: `${g.y}%` }}>
          <div
            onPointerDown={guideStart(g)} onPointerMove={guideMove} onPointerUp={guideEnd} onPointerCancel={guideEnd}
            className="relative flex items-center w-full min-h-[44px] -translate-y-1/2 cursor-ns-resize touch-none"
            role="slider" aria-label={g.title} aria-valuenow={Math.round(g.y)} aria-valuemin={0} aria-valuemax={100}
          >
            <div className="absolute left-0 right-0 h-[3px]" style={{ backgroundColor: g.color, boxShadow: `0 1px 8px ${g.color}` }} />
            <span
              className="relative ml-2 text-white text-[13px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap pointer-events-none"
              style={{ backgroundColor: g.color }}
            >
              {g.title} · {g.display}
            </span>
            <span
              className="relative ml-auto mr-2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold pointer-events-none"
              style={{ backgroundColor: g.color }}
            >
              ↕
            </span>
          </div>
        </div>
      ))}
      <p className="absolute bottom-3 left-3 bg-black/60 text-white text-[13px] px-3 py-1.5 rounded-full">
        {(guides?.length ?? 0) > 0 ? '가로선을 위·아래로 끌어 기장을 맞추세요' : '원하는 위치로 끌어보세요'}
      </p>
    </div>
  );
}
