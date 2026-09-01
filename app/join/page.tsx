'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Hand } from 'lucide-react';

export default function JoinPage() {
  const [room, setRoom] = useState('DEMO');
  const [question, setQuestion] = useState('質問を読み込んでいます…');
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [sent, setSent] = useState(false);
  const participant = useRef('');

  const refresh = useCallback(async (code: string) => {
    const response = await fetch(`/api/room?room=${code}`, { cache: 'no-store' });
    if (response.ok) setQuestion((await response.json()).room.question);
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room') || 'DEMO';
    setRoom(code);
    participant.current = localStorage.getItem('pinboard-participant') || crypto.randomUUID();
    localStorage.setItem('pinboard-participant', participant.current);
    refresh(code);
    const timer = window.setInterval(() => refresh(code), 1200);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function placePin(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
    setPoint(next); setSent(false);
    const response = await fetch('/api/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pin', room, participantId: participant.current, ...next }) });
    if (response.ok) setSent(true);
  }

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(160deg,#f5f3ff,#e0f2fe)] p-4 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-lg flex-col rounded-[2rem] bg-white p-5 shadow-2xl shadow-violet-200/50">
        <header className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-violet-600">PINBOARD</p><p className="text-sm text-slate-400">ルーム {room}</p></div><span className="size-3 animate-pulse rounded-full bg-emerald-400" /></header>
        <section className="py-7"><p className="text-sm font-bold text-slate-400">質問</p><h1 className="mt-2 text-2xl font-black leading-snug">{question}</h1></section>
        <button onPointerDown={placePin} aria-label="回答する位置をタップ" className="relative min-h-[360px] flex-1 touch-none overflow-hidden rounded-[1.6rem] border-2 border-slate-200 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:28px_28px] text-left">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-300" /><div className="absolute inset-y-0 left-1/2 border-l border-dashed border-slate-300" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-500">まだ分からない</span><span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-500">よく分かった</span>
          {!point && <span className="absolute inset-0 grid place-items-center text-center font-bold text-slate-400"><span><Hand className="mx-auto mb-2 size-8" />あなたの位置をタップ</span></span>}
          {point && <span className="pin-pop absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-violet-600 shadow-xl shadow-violet-300" style={{ left: `${point.x}%`, top: `${point.y}%` }} />}
        </button>
        <p className={`mt-5 flex h-8 items-center justify-center gap-2 font-bold transition ${sent ? 'text-emerald-600' : 'text-slate-400'}`}>{sent ? <><Check className="size-5" />スクリーンに送信しました</> : 'タップするとすぐ送信されます'}</p>
      </div>
    </main>
  );
}
