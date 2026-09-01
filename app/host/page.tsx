'use client';

import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Eraser, Sparkles, Users } from 'lucide-react';

type Pin = { id: number; x: number; y: number };

export default function HostPage() {
  const room = 'DEMO';
  const [question, setQuestion] = useState('今の理解度はどのくらいですか？');
  const [draft, setDraft] = useState(question);
  const [pins, setPins] = useState<Pin[]>([]);
  const [joinUrl, setJoinUrl] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/room?room=${room}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setQuestion(data.room.question);
    setPins(data.pins);
  }, []);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join?room=${room}`);
    refresh();
    const timer = window.setInterval(refresh, 700);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function saveQuestion(event: React.FormEvent) {
    event.preventDefault();
    await fetch('/api/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'question', room, question: draft }) });
    refresh();
  }

  async function clearPins() {
    await fetch('/api/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear', room }) });
    refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1500px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-h-[650px] flex-col rounded-[2rem] bg-white p-6 text-slate-900 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div><p className="mb-2 flex items-center gap-2 text-sm font-bold text-violet-600"><Sparkles className="size-4" /> LIVE QUESTION</p><h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-5xl">{question}</h1></div>
            <span className="flex items-center gap-2 rounded-full bg-violet-50 px-5 py-3 font-bold text-violet-700"><Users className="size-5" /> {pins.length}人</span>
          </div>
          <div className="relative mt-8 flex-1 overflow-hidden rounded-[1.6rem] border-2 border-slate-200 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px]">
            <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-slate-300" /><div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-slate-300" />
            <span className="absolute left-5 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-slate-500">まだよく分からない</span><span className="absolute right-5 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-slate-500">よく分かった</span>
            {pins.map((pin, index) => <span key={pin.id} className="pin-pop absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-violet-600 text-xs font-black text-white shadow-lg" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>{index + 1}</span>)}
            {pins.length === 0 && <div className="absolute inset-0 grid place-items-center text-center text-slate-400"><p><span className="block text-xl font-bold text-slate-600">参加者のタップを待っています</span>ピンがここにリアルタイムで表示されます</p></div>}
          </div>
        </section>
        <aside className="flex flex-col gap-5">
          <div className="rounded-[2rem] bg-white p-6 text-center text-slate-900"><p className="text-sm font-bold text-violet-600">スマホで参加</p><div className="mx-auto my-5 w-fit rounded-2xl border-8 border-violet-50 bg-white p-2">{joinUrl && <QRCodeSVG value={joinUrl} size={190} level="M" />}</div><p className="text-sm text-slate-500">ルームコード</p><p className="text-3xl font-black tracking-[.2em]">{room}</p></div>
          <form onSubmit={saveQuestion} className="rounded-[2rem] bg-slate-900 p-6 ring-1 ring-white/10"><label className="text-sm font-bold text-slate-300">質問を変更</label><textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-3 min-h-24 w-full resize-none rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-violet-400" /><button className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold transition hover:bg-violet-500">質問を表示</button></form>
          <button onClick={clearPins} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 font-bold text-slate-300 hover:bg-slate-900"><Eraser className="size-4" /> ピンをリセット</button>
        </aside>
      </div>
    </main>
  );
}
