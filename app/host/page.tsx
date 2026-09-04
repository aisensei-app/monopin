'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowUpRight, RotateCcw, Users, Maximize, Minimize, Pencil, Copy, Check, Eye, EyeOff, List, Home, SlidersHorizontal, X } from 'lucide-react';
import { PinBoard } from '@/components/pin-board';
import { Wordmark } from '@/components/wordmark';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { QUESTION } from '@/lib/reactions';
import { useEventRoom } from '@/hooks/use-event-room';
import { roomFromLocation, roomUrl, cloudMode, loginHost } from '@/lib/room-service';
import { defaultMoodPoints, type MoodPoint } from '@/components/mood-configurator';
import type { QuestionTemplate } from '@/lib/firebase-room-service';

export default function HostPage() {
  const [room,setRoom] = useState('');
  const { data, error, mutate, mutating } = useEventRoom(room);
  const [homeUrl,setHomeUrl] = useState('/');
  const [joinUrl, setJoinUrl] = useState('');
  const [localOnly, setLocalOnly] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [draft, setDraft] = useState(QUESTION);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const code = roomFromLocation();
    setRoom(code);
    setHomeUrl(roomUrl('home'));
    setJoinUrl(roomUrl('join',code,true));
    setLocalOnly(!cloudMode);
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', update);
  return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const total = data?.pins.length || 0;
  let moodPoints:MoodPoint[]|undefined;
  try { moodPoints = data?.template === 'mood' && data.layout ? (JSON.parse(data.layout) as MoodPoint[]) : undefined; } catch { moodPoints=defaultMoodPoints.slice(0,4); }
  async function update(action: 'reset' | 'question' | 'open' | 'visibility') {
    setBusy(true); setMessage('');
    try { await mutate({ action, question: draft, open: !data?.open, visible: !data?.showAnswers }); setConfirm(false); setEditing(false); }
    catch { setMessage('更新できませんでした。接続を確認して、もう一度お試しください。'); }
    finally { setBusy(false); }
  }
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { setMessage('この画面では全画面表示に対応していません。ブラウザーの全画面機能をご利用ください。'); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(joinUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setMessage('参加用URLを選択してコピーしてください。'); }
  }
    if (!room) return <main className="student-shell"><p>主催者用URLから開くか、新しい部屋を作成してください。</p><a className="preview-link" href={homeUrl}>部屋をつくる</a></main>;
  if (data && !data.isHost) return <main className="student-shell"><section className="student-card"><h1>主催者専用の画面です</h1><p>この部屋を作成したブラウザー・アカウントで開いてください。</p>{cloudMode && <button className="primary-button" onClick={async()=>{try{await loginHost();window.location.reload();}catch{setMessage('ログインできませんでした。もう一度お試しください。');}}}>主催者としてGoogleでログイン</button>}<p role="status">{message}</p><a className="preview-link" href={roomUrl('join',room)}>参加者として開く</a><a className="text-button" href={homeUrl}>別の部屋を作成する</a></section></main>;
  return (
    <main className="host-shell">
      <header className="host-header"><Wordmark href={homeUrl} /><span className="header-divider" /><span className="eyebrow">{data?.title || 'みんなのピンボード'}</span><div className="header-actions"><span className={`connection ${error ? 'offline' : ''}`}><span />{error ? '接続を確認中' : data ? data.open ? '回答受付中' : '受付終了' : '接続中'}</span><button className="icon-button" onClick={toggleFullscreen} aria-label={fullscreen ? '全画面表示を終了' : '全画面で表示'}>{fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button></div></header>
      <div className="host-layout">
        <section className="results-panel" aria-labelledby="host-question">
          <div className="question-topline"><div className="question-index"><span>01</span> みんなのピン</div><span className="anonymous-label">匿名で回答</span></div>
          <h1 id="host-question">{data?.question || QUESTION}</h1>
          <div className="results-heading"><p>今の気持ちに近い「場所」に、ピンを。</p><div className="total"><Users size={21} /><strong>{total}</strong><span>人が回答</span></div></div>
          <div className="host-board-wrap"><PinBoard pins={data?.showAnswers === false ? [] : data?.pins || []} moodPoints={moodPoints} template={(data?.template as QuestionTemplate) || 'mood'} layout={data?.layout || ''} /></div>
          <div className="results-footnote" role="status">{error || message || (data?.showAnswers === false ? '回答は主催者画面で非表示です。参加者の回答は受け付けています。' : (total ? '表情の間にも置けます。ピンが重なる場所ほど、色が濃くなります。' : 'まだピンはありません。QRコードから参加して、好きな場所をタップ。'))}</div>
        </section>
        <aside className="participation-panel">
          <div className="join-card"><span className="eyebrow">スマホで参加</span><h2>読み取って、<br />気持ちを教えてください。</h2><div className="qr-frame">{joinUrl && <QRCodeSVG value={joinUrl} size={208} level="M" fgColor="#254854" />}</div><p>カメラでQRコードを読み取るだけ。<br />名前の入力は必要ありません。</p><div className="join-link"><span>{joinUrl || '接続準備中…'}</span><button onClick={copyLink} disabled={!joinUrl} aria-label="参加用URLをコピー">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div><span className="network-note">{localOnly ? 'お試し中：このPCと同じWi-Fiで参加できます。' : '離れた場所からも、このURLで参加できます。'}</span></div>
          <a className="preview-link" href={roomUrl('join',room)} target="_blank" rel="noopener noreferrer"><span>このPCで回答を試す</span><ArrowUpRight size={21} /></a>
          <p className="preview-note">別タブで学生の画面が開きます</p>
        </aside>
      </div>
      <div className="host-dock" aria-label="主催者の操作"><button className="host-dock-main" disabled={!data || busy || mutating} onClick={()=>update('open')}>{data?.open ? '■ 受付を終了' : '▶ 回答を開始'}</button><div className="host-dock-icons"><button className="host-dock-icon" onClick={() => { if (!data?.open) { setDraft(data?.question || QUESTION); setEditing(true); } }} disabled={!data || !!data.open} aria-label={data?.open ? '受付中は編集できません' : '質問を編集'} title={data?.open ? '受付中は編集できません' : '質問を編集'}><Pencil size={19}/></button><button className="host-dock-icon" onClick={()=>update('visibility')} disabled={!data || busy} aria-label={data?.showAnswers === false ? '回答を表示する' : '回答を非表示にする'} title={data?.showAnswers === false ? '回答を表示する' : '回答を非表示にする'}>{data?.showAnswers === false ? <Eye size={20}/> : <EyeOff size={20}/>}</button><button className="host-dock-icon" onClick={() => setConfirm(true)} disabled={busy || !data || !total} aria-label="回答をリセット" title="回答をリセット"><RotateCcw size={19}/></button><button className="host-dock-icon" onClick={() => setToolsOpen(!toolsOpen)} aria-label="移動と設定" title="移動と設定"><SlidersHorizontal size={20}/></button></div></div>
      {toolsOpen && <div className="host-tools-popover"><a href={roomUrl('editor',room)}><List size={17}/>質問一覧</a><a href={homeUrl}><Home size={17}/>部屋一覧・トップ</a><button onClick={toggleFullscreen}>{fullscreen?<Minimize size={17}/>:<Maximize size={17}/>}全画面表示</button></div>}
      {editing && <aside className="host-edit-panel" aria-label="質問を編集"><div className="host-edit-heading"><strong>質問を編集</strong><button className="icon-button" onClick={()=>setEditing(false)} aria-label="編集を閉じる"><X size={19}/></button></div><form onSubmit={(e) => { e.preventDefault(); update('question'); }}><label htmlFor="question-draft">質問文</label><textarea id="question-draft" value={draft} maxLength={160} onChange={(e) => setDraft(e.target.value)} /><p>更新すると、現在の回答は新しい質問用に切り替わります。</p><a className="text-button" href={roomUrl('editor',room)}><SlidersHorizontal size={16}/>画面・文字を整える</a><button className="primary-button" disabled={busy || !draft.trim()}>{busy ? '更新中…' : '更新'}</button></form></aside>}
      <AlertDialog open={confirm} onOpenChange={(open) => { if (!busy) setConfirm(open); }}><AlertDialogContent><AlertDialogTitle>回答をリセットしますか？</AlertDialogTitle><AlertDialogDescription>今の{total}人分の回答を消して、同じ質問にもう一度回答できるようにします。</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={busy}>キャンセル</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={() => update('reset')}>{busy ? 'リセット中…' : 'リセットする'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}



