import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ImageRegion } from '../../types/image';

type Props = {
  src: string;
  region: ImageRegion;
  onChange: (region: ImageRegion) => void;
};

export function RegionEditor({ src, region, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ pointerX: 0, pointerY: 0, x: region.x, y: region.y });

  const normalizedPoint = (event: ReactPointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const handleDown = (event: ReactPointerEvent) => {
    const point = normalizedPoint(event);
    if (!point) return;
    start.current = { pointerX: point.x, pointerY: point.y, x: region.x, y: region.y };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMove = (event: ReactPointerEvent) => {
    if (!dragging) return;
    const point = normalizedPoint(event);
    if (!point) return;
    const nextX = Math.max(0, Math.min(1 - region.width, start.current.x + point.x - start.current.pointerX));
    const nextY = Math.max(0, Math.min(1 - region.height, start.current.y + point.y - start.current.pointerY));
    onChange({ ...region, x: nextX, y: nextY });
  };

  return (
    <div ref={ref} className="region-editor">
      <img src={src} alt="고객 사진" draggable={false} />
      <button
        type="button"
        aria-label="선택 영역 이동"
        className="region-box"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}
      >
        <span>{region.type}</span>
      </button>
    </div>
  );
}
