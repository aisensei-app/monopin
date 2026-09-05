'use client';

import { useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { QuestionTemplate } from '@/lib/firebase-room-service';
import type { MoodPoint } from '@/components/mood-configurator';
import { MoodSymbol } from '@/components/mood-face';
import worldMap from '@/assets/world-map.png';
import japanMap from '@/assets/japan-map.png';

export type MapBubble = { id: string; text: string; x: number; y: number };
export type DrawingStroke = {
  id: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
};

export function parseMapBubbles(layout?: string): MapBubble[] {
  if (!layout) return [];
  try {
    const value = JSON.parse(layout) as { bubbles?: MapBubble[] };
    return Array.isArray(value.bubbles)
      ? value.bubbles.filter((bubble) => typeof bubble?.text === 'string')
      : [];
  } catch {
    return [];
  }
}

export function parseDrawing(layout?: string): DrawingStroke[] {
  if (!layout) return [];
  try {
    const value = JSON.parse(layout) as { drawing?: DrawingStroke[] };
    return Array.isArray(value.drawing)
      ? value.drawing.filter((stroke) => Array.isArray(stroke?.points))
      : [];
  } catch {
    return [];
  }
}

export function TemplatePreview({
  template,
  moodPoints = [],
  bubbles = [],
  drawing = [],
  editable = false,
  onBubblesChange,
  onDrawingChange,
  drawingColor = '#276877',
  drawingWidth = 4,
  preview = false,
  interactivePreview = false,
}: {
  template: QuestionTemplate;
  moodPoints?: MoodPoint[];
  bubbles?: MapBubble[];
  drawing?: DrawingStroke[];
  editable?: boolean;
  onBubblesChange?: (next: MapBubble[]) => void;
  onDrawingChange?: (next: DrawingStroke[]) => void;
  drawingColor?: string;
  drawingWidth?: number;
  preview?: boolean;
  interactivePreview?: boolean;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<{ id: number; x: number; y: number }[]>([]);
  const move = (id: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!editable || !canvas.current) return;
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const update = (pointer: PointerEvent) => {
      const rect = canvas.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(
        5,
        Math.min(95, ((pointer.clientX - rect.left) / rect.width) * 100),
      );
      const y = Math.max(
        7,
        Math.min(93, ((pointer.clientY - rect.top) / rect.height) * 100),
      );
      onBubblesChange?.(
        bubbles.map((bubble) =>
          bubble.id === id ? { ...bubble, x, y } : bubble,
        ),
      );
    };
    const finish = () => {
      element.removeEventListener('pointermove', update);
      element.removeEventListener('pointerup', finish);
    };
    element.addEventListener('pointermove', update);
    element.addEventListener('pointerup', finish);
  };
  const isMap = template === 'world' || template === 'japan';
  const pointFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
      ),
      y: Math.max(
        0,
        Math.min(100, ((event.clientY - rect.top) / rect.height) * 100),
      ),
    };
  };
  const draw = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      template !== 'free' ||
      !editable ||
      !onDrawingChange ||
      JSON.stringify({ drawing }).length > 45000
    )
      return;
    event.preventDefault();
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const id = crypto.randomUUID();
    let next = [
      ...drawing,
      {
        id,
        color: drawingColor,
        width: drawingWidth,
        points: [pointFromEvent(event)],
      },
    ];
    onDrawingChange(next);
    const move = (pointer: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const point = {
        x:
          Math.round(
            Math.max(
              0,
              Math.min(100, ((pointer.clientX - rect.left) / rect.width) * 100),
            ) * 10,
          ) / 10,
        y:
          Math.round(
            Math.max(
              0,
              Math.min(100, ((pointer.clientY - rect.top) / rect.height) * 100),
            ) * 10,
          ) / 10,
      };
      next = next.map((stroke) =>
        stroke.id === id && stroke.points.length < 1200
          ? { ...stroke, points: [...stroke.points, point] }
          : stroke,
      );
      onDrawingChange(next);
    };
    const finish = () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', finish);
      element.removeEventListener('pointercancel', finish);
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', finish);
    element.addEventListener('pointercancel', finish);
  };
  const addPreviewPin = (x: number, y: number) => {
    const pin = { id: Date.now(), x, y };
    setPins((items) => [...items, pin]);
    window.setTimeout(
      () => setPins((items) => items.filter((item) => item.id !== pin.id)),
      3000,
    );
  };
  const placePreviewPin = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactivePreview || (template === 'free' && editable)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    addPreviewPin(
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
    );
  };
  return (
    <div
      ref={canvas}
      className={`template-board template-${template} ${interactivePreview ? 'is-interactive-preview' : ''} ${template === 'free' && editable ? 'is-drawing' : ''}`}
      aria-label={`${template}のプレビュー`}
      role="application"
      tabIndex={interactivePreview ? 0 : undefined}
      onClick={placePreviewPin}
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' &&
          interactivePreview &&
          !(template === 'free' && editable)
        )
          addPreviewPin(50, 50);
      }}
      onPointerDown={draw}
    >
      {preview && <span className="template-preview-label">プレビュー</span>}
      {template === 'mood' && (
        <div
          className="preview-moods"
          data-count={Math.min(8, moodPoints.length)}
        >
          {moodPoints.slice(0, 8).map((point, index) => (
            <div key={index}>
              <MoodSymbol point={point} />
              <small>{point.label}</small>
            </div>
          ))}
        </div>
      )}
      {isMap && (
        <img
          className="map-art"
          src={
            (template === 'world' ? worldMap : japanMap) as unknown as string
          }
          alt=""
        />
      )}
      {template === 'matrix' && (
        <>
          <span className="matrix-line horizontal" />
          <span className="matrix-line vertical" />
          <small className="matrix-label top">高い</small>
          <small className="matrix-label bottom">低い</small>
          <small className="matrix-label left">低い</small>
          <small className="matrix-label right">高い</small>
        </>
      )}
      {template === 'free' && (
        <>
          <svg
            className="free-drawing"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-label="自由ボードに描いた絵"
          >
            {drawing.map((stroke) => (
              <polyline
                key={stroke.id}
                points={stroke.points
                  .map((point) => `${point.x},${point.y}`)
                  .join(' ')}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width / 4}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {drawing.length === 0 && (
            <span className="free-note">
              {editable
                ? 'ここにマウスで絵を描けます'
                : '好きな場所にピンを置けます'}
            </span>
          )}
        </>
      )}
      {isMap &&
        bubbles.map((bubble) => (
          <button
            type="button"
            className={`map-bubble ${editable ? 'is-editable' : ''}`}
            key={bubble.id}
            style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation();
              move(bubble.id, event);
            }}
            aria-label={
              editable ? `${bubble.text || '吹き出し'}を動かす` : undefined
            }
          >
            {bubble.text || 'テキスト'}
          </button>
        ))}
      {pins.map((pin) => (
        <span
          className="preview-pin"
          key={pin.id}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          <span className="preview-pin-halo" />
          <MapPin aria-hidden="true" />
          <span className="preview-pin-touchpoint" />
        </span>
      ))}
    </div>
  );
}
