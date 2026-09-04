'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCheck, LoaderCircle } from 'lucide-react';
import { PinBoard } from '@/components/pin-board';
import { Wordmark } from '@/components/wordmark';
import type { Point } from '@/lib/pinboard';
import { useEventRoom } from '@/hooks/use-event-room';
import { roomFromLocation } from '@/lib/room-service';
import { QUESTION } from '@/lib/reactions';
import { trackEvent } from '@/components/analytics';
import { defaultMoodPoints, type MoodPoint } from '@/components/mood-configurator';

export default function JoinPage() {
  const [room,setRoom] = useState('');
  const { data, error, mutate } = useEventRoom(room);
  const [pending, setPending] = useState<Point | null>(null);
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  useEffect(() => {const code=roomFromLocation();setRoom(code);if(code)trackEvent('join_room');}, []);
  useEffect(() => { setNotice(''); }, [data?.revision]);
  async function vote(point: Point) {
    if (busy.current || !data || !room) return;

    busy.current = true;
    setPending(point); setNotice('');
    try { await mutate({ action: 'vote', ...point, revision: data.revision }); trackEvent('place_pin'); }
    catch (err) { setNotice(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : '送信できませんでした。もう一度お試しください。'); }
    finally { busy.current = false; setPending(null); }
  }
  const selected = data?.selected ?? null;
  let moodPoints:MoodPoint[]|undefined;
  try { moodPoints = data?.layout ? (JSON.parse(data.layout) as MoodPoint[]) : undefined; } catch { moodPoints=defaultMoodPoints.slice(0,4); }
  if (!room) return <main className="student-shell"><section className="student-card"><h1>参加用URLからお入りください</h1><p>主催者から届いたQRコードか、チャットに貼られた参加URLを開いてください。</p></section></main>;
  return (
    <main className="student-shell">
      <header className="student-header"><Wordmark href={typeof window === 'undefined' ? '#' : window.location.href} /><span className="eyebrow">{data?.open === false ? '受付終了' : '参加者の画面'}</span></header>
      <section className="student-card" aria-labelledby="question">
        <div className="question-index"><span>01</span> {data?.title || 'ピンで回答'}</div>
        <h1 id="question">{data?.question || QUESTION}</h1>
        <p className="student-instruction">今の気持ちに近い場所をタップ。表情の間もOK。</p>
        <PinBoard own={selected} pending={pending} onPlace={vote} disabled={pending !== null || !data || !room || !data.open || !!error} moodPoints={moodPoints} />
        <div className={`answer-status ${selected !== null ? 'is-sent' : ''}`} role="status" aria-live="polite">
          {pending !== null ? <><LoaderCircle className="spinning" size={22} />ピンを送っています…</> : error || notice ? <span>{notice || error}</span> : !data ? <><LoaderCircle className="spinning" size={22} />質問に接続しています…</> : data?.open === false ? '受付は終了しました。ご参加ありがとうございました。' : selected !== null ? <><CheckCheck size={24} />ピンを置きました</> : 'ボードの好きな場所をタップしてください'}
        </div>
        <p className="answer-hint">{selected !== null ? '別の場所をタップすると、ピンが移動します。' : '表情は目印です。真ん中や端にも置けます。'}</p>
      </section>
      <footer className="student-footer">名前の入力は不要です。先生の画面には、みんなのピンが表示されます。</footer>
    </main>
  );
}


