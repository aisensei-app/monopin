'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { ReactionFace } from '@/components/reaction-face';
import { choices } from '@/lib/reactions';
import { pointFromRect, type BoardPin, type Point } from '@/lib/pinboard';

const landmarks = [{ x: 23, y: 25 }, { x: 77, y: 25 }, { x: 23, y: 77 }, { x: 77, y: 77 }];

export function PinBoard({ pins = [], own, pending, onPlace, disabled = false }: {
  pins?: BoardPin[]; own?: Point | null; pending?: Point | null;
  onPlace?: (point: Point) => void; disabled?: boolean;
}) {
  const [cursor, setCursor] = useState<Point>({ x: 50, y: 50 });
  const [keyboard, setKeyboard] = useState(false);
  const visiblePins = onPlace ? (pending || own ? [{ ...(pending || own)!, id: 0 }] : []) : pins;
  return <div className={`pin-canvas ${onPlace ? 'is-interactive' : 'is-display'}`}>
    <div className="board-art" aria-hidden="true">
      {landmarks.map((position, index) => <div className="board-landmark" key={index} style={{ left: `${position.x}%`, top: `${position.y}%` }}><ReactionFace choice={index} /><span>{choices[index].label}</span></div>)}
      <span className="board-center-mark" />
    </div>
    {onPlace && <button type="button" className="board-hit-area" disabled={disabled} aria-label="好きな位置にピンを置く。矢印キーで位置を動かし、Enterで送信できます。" onClick={(event) => {
      const point = event.detail === 0 ? cursor : pointFromRect(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
      if (event.detail !== 0) setKeyboard(false);
      setCursor(point); onPlace(point);
    }} onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); setKeyboard(true);
      const step = event.shiftKey ? 1 : 5;
      setCursor((point) => ({ x: Math.max(0, Math.min(100, point.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0))), y: Math.max(0, Math.min(100, point.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0))) }));
    }} onBlur={() => setKeyboard(false)} />}
    <div className="board-pin-layer" aria-hidden="true">
      {visiblePins.map((pin) => <span key={`${pin.id}-${pin.x}-${pin.y}`} className={`board-pin ${pending ? 'pending-pin' : ''}`} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}><span className="pin-halo" /><MapPin className="pin-marker" viewBox="2 1 20 21" preserveAspectRatio="xMidYMax meet" strokeWidth={1.8} /><span className="pin-touchpoint" /></span>)}
      {keyboard && onPlace && <span className="board-cursor" style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }} />}
    </div>
    {!onPlace && <span className="sr-only">{pins.length}人のピンを表示中</span>}
  </div>;
}
