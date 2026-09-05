'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { pointFromRect, type BoardPin, type Point } from '@/lib/pinboard';
import { defaultMoodPointsFor, type MoodPoint } from '@/components/mood-configurator';
import { MoodSymbol } from '@/components/mood-face';
import {
  TemplatePreview,
  parseDrawing,
  parseMapBubbles,
} from '@/components/template-preview';
import type { QuestionTemplate } from '@/lib/firebase-room-service';

const moodLandmarks = (count: number) => {
  const columns = Math.max(2, count / 2);
  return Array.from({ length: count }, (_, index) => ({
    x: columns === 2 ? 28 + (index % columns) * 44 : 12 + ((index % columns) * 76) / (columns - 1),
    y: index < columns ? 29 : 71,
  }));
};

export function PinBoard({
  pins = [],
  own,
  pending,
  onPlace,
  disabled = false,
  moodPoints,
  template = 'mood',
  layout = '',
}: {
  pins?: BoardPin[];
  own?: Point | null;
  pending?: Point | null;
  onPlace?: (point: Point) => void;
  disabled?: boolean;
  moodPoints?: MoodPoint[];
  template?: QuestionTemplate;
  layout?: string;
}) {
  const [cursor, setCursor] = useState<Point>({ x: 50, y: 50 });
  const [keyboard, setKeyboard] = useState(false);
  const [detail, setDetail] = useState<{
    point: MoodPoint;
    position: { x: number; y: number };
  } | null>(null);
  const points = moodPoints?.length ? moodPoints : defaultMoodPointsFor(4);
  const landmarks = moodLandmarks(points.length);
  const visiblePins = onPlace
    ? pending || own
      ? [{ ...(pending || own)!, id: 0 }]
      : []
    : pins;
  return (
    <div className={`pin-canvas ${onPlace ? 'is-interactive' : 'is-display'}`}>
      <div className="board-art" aria-hidden="true">
        {template === 'mood' && (
          <>
            {landmarks.map((position, index) => (
              <div
                className="board-landmark"
                key={index}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <>
                  <MoodSymbol point={points[index]} />
                  <span>{points[index].label}</span>
                </>
              </div>
            ))}
            <span className="board-center-mark" />
          </>
        )}
        {template !== 'mood' && (
          <TemplatePreview
            template={template}
            bubbles={parseMapBubbles(layout)}
            drawing={parseDrawing(layout)}
          />
        )}
      </div>
      {onPlace && (
        <button
          type="button"
          className="board-hit-area"
          disabled={disabled}
          aria-label="好きな位置にピンを置く。矢印キーで位置を動かし、Enterで送信できます。"
          onClick={(event) => {
            const point =
              event.detail === 0
                ? cursor
                : pointFromRect(
                    event.clientX,
                    event.clientY,
                    event.currentTarget.getBoundingClientRect(),
                  );
            if (event.detail !== 0) setKeyboard(false);
            setCursor(point);
            onPlace(point);
          }}
          onKeyDown={(event) => {
            if (
              !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
                event.key,
              )
            )
              return;
            event.preventDefault();
            setKeyboard(true);
            const step = event.shiftKey ? 1 : 5;
            setCursor((point) => ({
              x: Math.max(
                0,
                Math.min(
                  100,
                  point.x +
                    (event.key === 'ArrowRight'
                      ? step
                      : event.key === 'ArrowLeft'
                        ? -step
                        : 0),
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  100,
                  point.y +
                    (event.key === 'ArrowDown'
                      ? step
                      : event.key === 'ArrowUp'
                        ? -step
                        : 0),
                ),
              ),
            }));
          }}
          onBlur={() => setKeyboard(false)}
        />
      )}
      {template === 'mood' &&
        moodPoints?.map(
          (point, index) =>
            point.detail && (
              <button
                type="button"
                className="landmark-detail-trigger"
                key={`detail-${index}`}
                style={{
                  left: `${landmarks[index].x}%`,
                  top: `${landmarks[index].y}%`,
                }}
                aria-label={`${point.label}の補足を表示`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  const timer = window.setTimeout(
                    () => setDetail({ point, position: landmarks[index] }),
                    450,
                  );
                  event.currentTarget.dataset.timer = String(timer);
                }}
                onPointerUp={(event) => {
                  window.clearTimeout(
                    Number(event.currentTarget.dataset.timer),
                  );
                }}
                onPointerLeave={(event) =>
                  window.clearTimeout(Number(event.currentTarget.dataset.timer))
                }
              />
            ),
        )}
      {detail && (
        <div
          className="landmark-detail"
          style={{
            left: `${detail.position.x}%`,
            top: `${detail.position.y > 50 ? detail.position.y - 18 : detail.position.y + 15}%`,
          }}
          role="status"
        >
          {detail.point.detail}
        </div>
      )}
      <div className="board-pin-layer" aria-hidden="true">
        {visiblePins.map((pin) => (
          <span
            key={`${pin.id}-${pin.x}-${pin.y}`}
            className={`board-pin ${pending ? 'pending-pin' : ''}`}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            <span className="pin-halo" />
            <MapPin
              className="pin-marker"
              viewBox="2 1 20 21"
              preserveAspectRatio="xMidYMax meet"
              strokeWidth={1.8}
            />
            <span className="pin-touchpoint" />
          </span>
        ))}
        {keyboard && onPlace && (
          <span
            className="board-cursor"
            style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
          />
        )}
      </div>
      {!onPlace && (
        <span className="sr-only">{pins.length}人のピンを表示中</span>
      )}
    </div>
  );
}
