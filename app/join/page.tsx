'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCheck, LoaderCircle, Volume2, VolumeX } from 'lucide-react';
import { PinBoard } from '@/components/pin-board';
import { Wordmark } from '@/components/wordmark';
import type { Point } from '@/lib/pinboard';
import { useEventRoom } from '@/hooks/use-event-room';
import { roomFromLocation } from '@/lib/room-service';
import { QUESTION } from '@/lib/reactions';
import { trackEvent } from '@/components/analytics';
import { defaultMoodPointsFor, type MoodPoint } from '@/components/mood-configurator';
import type { QuestionTemplate } from '@/lib/firebase-room-service';
import { playPinSound } from '@/lib/pin-sound';

export default function JoinPage() {
  const [room,setRoom] = useState('');
  const { data, error, mutate } = useEventRoom(room);
  const [pending, setPending] = useState<Point | null>(null);
  const [notice, setNotice] = useState('');
  const [muted, setMuted] = useState(false);
  const busy = useRef(false);
  const lastVote = useRef(0);
  useEffect(() => {const code=roomFromLocation();setRoom(code);if(code)trackEvent('join_room');}, []);
  useEffect(() => { setNotice(''); }, [data?.revision]);
  async function vote(point: Point) {
    const now = Date.now();
    if (busy.current || now - lastVote.current < 500 || !data || !room) return;

    lastVote.current = now;
    busy.current = true;
    setPending(point); setNotice('');
    try { await mutate({ action: 'vote', ...point, revision: data.revision }); if (data.soundEnabled && !muted) playPinSound(); trackEvent('place_pin'); }
    catch (err) { setNotice(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : '送信できませんでした。もう一度お試しください。'); }
    finally { busy.current = false; setPending(null); }
  }
  const selected = data?.selected ?? null;
  let moodPoints:MoodPoint[]|undefined;
  try { moodPoints = data?.template === 'mood' && data.layout ? (JSON.parse(data.layout) as MoodPoint[]) : undefined; } catch { moodPoints=defaultMoodPointsFor(4); }
  if (!room) return <main className="student-shell"><section className="student-card"><h1>参加用URLからお入りください</h1><p>主催者から届いたQRコードか、チャットに貼られた参加URLを開いてください。</p></section></main>;
  return (
    <main className="student-shell">
      <header className="student-header"><Wordmark href={typeof window === 'undefined' ? '#' : window.location.href} /><div className="student-header-actions"><span className="eyebrow">{data?.open === false ? '受付終了' : '参加者の画面'}</span>{data?.soundEnabled && <button type="button" className="sound-mute-button" aria-label={muted?'効果音を出す':'効果音を消す'} aria-pressed={muted} onClick={()=>setMuted(value=>!value)}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}</div></header>
      <section className="student-card" aria-labelledby="question">
        <div className="question-index"><span>01</span> {data?.title || 'ピンで回答'}</div>
        <h1 id="question">{data?.question || QUESTION}</h1>
        <p className="student-instruction">画面をタップして、ピンしよう！</p>
        <PinBoard own={selected} pending={pending} onPlace={vote} disabled={pending !== null || !data || !room || !data.open || !!error} moodPoints={moodPoints} template={(data?.template as QuestionTemplate) || 'mood'} layout={data?.layout || ''} />
        <div className={`answer-status ${selected !== null ? 'is-sent' : ''}`} role="status" aria-live="polite">
          {pending !== null ? <><LoaderCircle className="spinning" size={22} />ピンを送っています…</> : error || notice ? <span>{notice || error}</span> : !data ? <><LoaderCircle className="spinning" size={22} />質問に接続しています…</> : data?.open === false ? 'この質問の受付は終了しました。' : selected !== null ? <><CheckCheck size={24} />ピンを置きました</> : 'ボードの好きな場所をタップしてください'}
        </div>
        <p className="answer-hint">{selected !== null ? '別の場所をタップすると、ピンが移動します。' : '境界の上でも、端でも、好きな場所に置けます。'}</p>
      </section>
      <footer className="student-footer">名前の入力は不要です。先生の画面には、みんなのピンが表示されます。</footer>
    </main>
  );
}
