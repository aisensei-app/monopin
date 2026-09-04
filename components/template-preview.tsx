'use client';

import { useRef } from 'react';
import type { QuestionTemplate } from '@/lib/firebase-room-service';
import type { MoodPoint } from '@/components/mood-configurator';
import worldMap from '@/assets/world-map.png';
import japanMap from '@/assets/japan-map.png';

export type MapBubble = { id: string; text: string; x: number; y: number };

export function parseMapBubbles(layout?: string): MapBubble[] {
  if (!layout) return [];
  try {
    const value = JSON.parse(layout) as { bubbles?: MapBubble[] };
    return Array.isArray(value.bubbles) ? value.bubbles.filter((bubble) => typeof bubble?.text === 'string') : [];
  } catch { return []; }
}

export function TemplatePreview({ template, moodPoints = [], bubbles = [], editable = false, onBubblesChange }: {
  template: QuestionTemplate; moodPoints?: MoodPoint[]; bubbles?: MapBubble[]; editable?: boolean; onBubblesChange?: (next: MapBubble[]) => void;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const move = (id: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!editable || !canvas.current) return;
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const update = (pointer: PointerEvent) => {
      const rect = canvas.current?.getBoundingClientRect(); if (!rect) return;
      const x = Math.max(5, Math.min(95, (pointer.clientX - rect.left) / rect.width * 100));
      const y = Math.max(7, Math.min(93, (pointer.clientY - rect.top) / rect.height * 100));
      onBubblesChange?.(bubbles.map((bubble) => bubble.id === id ? { ...bubble, x, y } : bubble));
    };
    const finish = () => { element.removeEventListener('pointermove', update); element.removeEventListener('pointerup', finish); };
    element.addEventListener('pointermove', update); element.addEventListener('pointerup', finish);
  };
  const isMap = template === 'world' || template === 'japan';
  return <div ref={canvas} className={`template-board template-${template}`} aria-label={`${template}のプレビュー`}>
    {template === 'mood' && <div className="preview-moods">{moodPoints.slice(0, 8).map((point, index) => <div key={index}><span>{point.emoji}</span><small>{point.label}</small></div>)}</div>}
    {isMap && <img className="map-art" src={(template === 'world' ? worldMap : japanMap).src} alt="" />}
    {template === 'matrix' && <><span className="matrix-line horizontal"/><span className="matrix-line vertical"/><small className="matrix-label top">高い</small><small className="matrix-label bottom">低い</small><small className="matrix-label left">低い</small><small className="matrix-label right">高い</small></>}
    {template === 'free' && <span className="free-note">好きな場所にピンを置けます</span>}
    {isMap && bubbles.map((bubble) => <button type="button" className={`map-bubble ${editable ? 'is-editable' : ''}`} key={bubble.id} style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }} onPointerDown={(event) => move(bubble.id, event)} aria-label={editable ? `${bubble.text || '吹き出し'}を動かす` : undefined}>{bubble.text || 'テキスト'}</button>)}
  </div>;
}
