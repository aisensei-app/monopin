'use client';

import { useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { QuestionTemplate } from '@/lib/firebase-room-service';
import type { MoodPoint } from '@/components/mood-configurator';
import { playPinSound } from '@/lib/pin-sound';
import worldMap from '@/assets/world-map.png';
import japanMap from '@/assets/japan-map.png';

export type MapBubble = { id: string; text: string; x: number; y: number };
export type DrawingStroke = {
  id: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
};
export type MatrixLabels = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
};
export type MapChoice = 'world' | 'japan';

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

export function parseMatrixLabels(layout?: string): MatrixLabels {
  if (!layout) return {};
  try {
    const value = JSON.parse(layout) as { matrixLabels?: MatrixLabels };
    const labels = value.matrixLabels;
    if (!labels || typeof labels !== 'object') return {};
    const pick = (input?: string) =>
      typeof input === 'string' ? input.slice(0, 20) : undefined;
    return {
      top: pick(labels.top),
      bottom: pick(labels.bottom),
      left: pick(labels.left),
      right: pick(labels.right),
    };
  } catch {
    return {};
  }
}

export function parseMatrixTextBoxes(layout?: string): MapBubble[] {
  if (!layout) return [];
  try {
    const value = JSON.parse(layout) as { matrixTextBoxes?: MapBubble[] };
    return Array.isArray(value.matrixTextBoxes)
      ? value.matrixTextBoxes.filter((box) => typeof box?.text === 'string')
      : [];
  } catch {
    return [];
  }
}

export function resolveMapChoice(
  template: QuestionTemplate,
  layout?: string,
): MapChoice {
  if (template === 'world' || template === 'japan') return template;
  if (layout) {
    try {
      const value = JSON.parse(layout) as { mapChoice?: string };
      if (value.mapChoice === 'japan') return 'japan';
    } catch {}
  }
  return 'world';
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
  soundEnabled = false,
  matrixLabels = {},
  textBoxes = [],
  onTextBoxesChange,
  mapChoice = 'world',
  choiceOptions = [],
  choicePins,
  onChoicePlace,
  choiceDisabled = false,
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
  soundEnabled?: boolean;
  matrixLabels?: MatrixLabels;
  textBoxes?: MapBubble[];
  onTextBoxesChange?: (next: MapBubble[]) => void;
  mapChoice?: MapChoice;
  choiceOptions?: string[];
  choicePins?: { id: number | string; x: number; y: number }[];
  onChoicePlace?: (point: { x: number; y: number }) => void;
  choiceDisabled?: boolean;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<{ id: number; x: number; y: number }[]>([]);
  const moveItem = (
    items: MapBubble[],
    onChange: ((next: MapBubble[]) => void) | undefined,
    id: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
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
      onChange?.(
        items.map((item) => (item.id === id ? { ...item, x, y } : item)),
      );
    };
    const finish = () => {
      element.removeEventListener('pointermove', update);
      element.removeEventListener('pointerup', finish);
    };
    element.addEventListener('pointermove', update);
    element.addEventListener('pointerup', finish);
  };
  const isMap = template === 'world' || template === 'japan' || template === 'map';
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
    if (soundEnabled) playPinSound();
    window.setTimeout(
      () => setPins((items) => items.filter((item) => item.id !== pin.id)),
      3000,
    );
  };
  const placePreviewPin = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      !interactivePreview ||
      (template === 'free' && editable) ||
      template === 'choice'
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    addPreviewPin(
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
    );
  };
  return (
    <div
      ref={canvas}
      className={`template-board template-${template} ${isMap ? `map-choice-${mapChoice}` : ''} ${interactivePreview ? 'is-interactive-preview' : ''} ${template === 'free' && editable ? 'is-drawing' : ''} ${preview ? 'has-preview-label' : ''}`}
      aria-label={`${template}のプレビュー`}
      role="application"
      tabIndex={interactivePreview ? 0 : undefined}
      onClick={placePreviewPin}
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' &&
          interactivePreview &&
          !(template === 'free' && editable) &&
          template !== 'choice'
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
              <span className="mood-emoji">{point.emoji}</span>
              <small>{point.label}</small>
            </div>
          ))}
        </div>
      )}
      {isMap && (
        <img
          className="map-art"
          src={(mapChoice === 'japan' ? japanMap : worldMap) as unknown as string}
          alt=""
        />
      )}
      {template === 'matrix' && (
        <>
          <span className="matrix-line horizontal" />
          <span className="matrix-line vertical" />
          <small className="matrix-label top">
            {matrixLabels.top || '高い'}
          </small>
          <small className="matrix-label bottom">
            {matrixLabels.bottom || '低い'}
          </small>
          <small className="matrix-label left">
            {matrixLabels.left || '低い'}
          </small>
          <small className="matrix-label right">
            {matrixLabels.right || '高い'}
          </small>
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
      {template === 'choice' && (
        <ChoicePinCards options={choiceOptions} pins={choicePins || pins}
          onPlace={onChoicePlace || (interactivePreview ? point => addPreviewPin(point.x, point.y) : undefined)}
          disabled={choiceDisabled} />
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
              moveItem(bubbles, onBubblesChange, bubble.id, event);
            }}
            aria-label={
              editable ? `${bubble.text || '吹き出し'}を動かす` : undefined
            }
          >
            {bubble.text || 'テキスト'}
          </button>
        ))}
      {template === 'matrix' &&
        textBoxes.map((box) => (
          <button
            type="button"
            className={`matrix-textbox ${editable ? 'is-editable' : ''}`}
            key={box.id}
            style={{ left: `${box.x}%`, top: `${box.y}%` }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation();
              moveItem(textBoxes, onTextBoxesChange, box.id, event);
            }}
            aria-label={
              editable ? `${box.text || 'テキストボックス'}を動かす` : undefined
            }
          >
            {box.text || 'テキスト'}
          </button>
        ))}
      {(template === 'choice' ? [] : pins).map((pin) => (
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

/** Coordinates use the existing two-row storage grid, independently of card pixel sizes. */
export function encodeChoicePoint(index: number, count: number, point: { x: number; y: number }) {
  const columns = Math.max(2, count / 2);
  const inside = (value: number) => Math.max(0.0001, Math.min(99.9999, value));
  return { x: ((index % columns) * 100 + inside(point.x)) / columns,
    y: (Math.floor(index / columns) * 100 + inside(point.y)) / 2 };
}
export function decodeChoicePoint(count: number, point: { x: number; y: number }) {
  const columns = Math.max(2, count / 2);
  const column = Math.min(columns - 1, Math.floor(point.x * columns / 100));
  const row = Math.min(1, Math.floor(point.y * 2 / 100));
  return { index: row * columns + column, x: point.x * columns - column * 100, y: point.y * 2 - row * 100 };
}

function ChoicePinCards({ options, pins, onPlace, disabled = false }: {
  options: string[];
  pins: { id: number | string; x: number; y: number }[];
  onPlace?: (point: { x: number; y: number }) => void;
  disabled?: boolean;
}) {
  const [cursor, setCursor] = useState({ index: 0, x: 50, y: 50 });
  const [keyboard, setKeyboard] = useState(false);
  return <div className="choice-options" data-count={options.length}>
    {options.map((option, index) => <div className="choice-card" key={index}>
      <div className="choice-card-text">{option || `カード${index + 1}`}</div>
      {onPlace && <button type="button" className="choice-card-hit" disabled={disabled}
        aria-label={`カード${index + 1}：${option}。好きな位置にピンを置く。矢印キーで移動、Enterで送信。`}
        onFocus={() => setCursor({ index, x: 50, y: 50 })}
        onBlur={() => setKeyboard(false)}
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          const point = event.detail === 0 ? cursor : {
            x: (event.clientX - rect.left) / rect.width * 100,
            y: (event.clientY - rect.top) / rect.height * 100,
          };
          if (event.detail !== 0) setKeyboard(false);
          onPlace(encodeChoicePoint(index, options.length, point));
        }}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation(); setKeyboard(true);
          const step = event.shiftKey ? 1 : 5;
          setCursor(p => ({ index, x: Math.max(0, Math.min(100, p.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0))),
            y: Math.max(0, Math.min(100, p.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0))) }));
        }} />}
      <div className="board-pin-layer" aria-hidden="true">
        {pins.map(pin => ({ ...decodeChoicePoint(options.length, pin), id: pin.id })).filter(pin => pin.index === index).map(pin =>
          <span className="board-pin" key={pin.id} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
            <span className="pin-halo" />
            <MapPin className="pin-marker" viewBox="2 1 20 21" preserveAspectRatio="xMidYMax meet" strokeWidth={1.8} />
            <span className="pin-touchpoint" />
          </span>)}
        {keyboard && cursor.index === index && <span className="board-cursor" style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }} />}
      </div>
    </div>)}
  </div>;
}
