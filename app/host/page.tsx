'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowUpRight, RotateCcw, Users, Maximize, Minimize, Pencil, Copy, Check, Eye, EyeOff, List, Home, SlidersHorizontal, X, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { PinBoard } from '@/components/pin-board';
import { Wordmark } from '@/components/wordmark';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { QUESTION } from '@/lib/reactions';
import { useEventRoom } from '@/hooks/use-event-room';
import { roomFromLocation, roomUrl, cloudMode, loginHost } from '@/lib/room-service';
import { defaultMoodPointsFor, type MoodPoint } from '@/components/mood-configurator';
import type { QuestionTemplate } from '@/lib/firebase-room-service';
import { AccountMenu } from '@/components/account-menu';

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
  const [titleDraft, setTitleDraft] = useState('');
  const [titleBusy, setTitleBusy] = useState(false);
  const [titleMessage, setTitleMessage] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dockPos, setDockPos] = useState<{ x: number; y: number } | null>(null);
  const toolsWrapRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const dockDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  function clampDockPos(x: number, y: number) {
    const dock = dockRef.current;
    const margin = 8;
    const w = dock?.offsetWidth || 0;
    const h = dock?.offsetHeight || 0;
    return {
      x: Math.min(Math.max(x, margin), Math.max(margin, window.innerWidth - w - margin)),
      y: Math.min(Math.max(y, margin), Math.max(margin, window.innerHeight - h - margin)),
    };
  }
  function onDockGripPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const dock = dockRef.current;
    if (!dock) return;
    const rect = dock.getBoundingClientRect();
    dockDragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onDockGripPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dockDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setDockPos(clampDockPos(drag.origX + dx, drag.origY + dy));
  }
  function onDockGripPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    dockDragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }
  useEffect(() => {
    function onResize() { setDockPos((pos) => (pos ? clampDockPos(pos.x, pos.y) : pos)); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
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
  useEffect(() => {
    if (!toolsOpen) return;
    const closeOnOutside = (e: MouseEvent) => { if (toolsWrapRef.current && !toolsWrapRef.current.contains(e.target as Node)) setToolsOpen(false); };
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setToolsOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [toolsOpen]);
  const total = data?.pins.length || 0;
  let moodPoints:MoodPoint[]|undefined;
  try { moodPoints = data?.template === 'mood' && data.layout ? (JSON.parse(data.layout) as MoodPoint[]) : undefined; } catch { moodPoints=defaultMoodPointsFor(4); }
  async function update(action: 'reset' | 'question' | 'open' | 'visibility') {
    setBusy(true); setMessage('');
    try { await mutate({ action, question: draft, open: !data?.open, visible: !data?.showAnswers }); setConfirm(false); setEditing(false); }
    catch { setMessage('更新できませんでした。接続を確認して、もう一度お試しください。'); }
    finally { setBusy(false); }
  }
  async function saveTitle() {
    setTitleBusy(true); setTitleMessage('');
    try { await mutate({ action: 'title', title: titleDraft }); }
    catch (err) { setTitleMessage(err instanceof Error ? err.message : '部屋の名前を更新できませんでした。'); }
    finally { setTitleBusy(false); }
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
      <header className="host-header"><Wordmark href={homeUrl} /><span className="header-divider" /><span className="eyebrow">{data?.title || 'みんなのピンボード'}</span><div className="header-actions"><span className="anonymous-label">匿名で回答</span><span className={`connection ${error ? 'offline' : ''}`}><span />{error ? '接続を確認中' : data ? data.open ? '回答受付中' : '受付終了' : '接続中'}</span><AccountMenu /></div></header>
      <div className="host-layout">
        <section className="results-panel" aria-labelledby="host-question">
          <div className="host-meta-row"><span /><div className="question-switcher" aria-label="質問の切り替え(準備中)"><button type="button" disabled title="近日公開予定"><ChevronLeft size={16}/>前へ</button><button type="button" disabled title="近日公開予定">次へ<ChevronRight size={16}/></button></div><div className="total"><Users size={21} /><strong>{total}</strong><span>人が回答</span></div></div>
          <h1 id="host-question">{data?.question || QUESTION}</h1>
          <div className="host-board-wrap"><PinBoard pins={data?.showAnswers === false ? [] : data?.pins || []} moodPoints={moodPoints} template={(data?.template as QuestionTemplate) || 'mood'} layout={data?.layout || ''} /></div>
          <div className="results-footnote" role="status">{error || message || (data?.showAnswers === false ? '回答は主催者画面で非表示です。参加者の回答は受け付けています。' : (total ? 'ピンが重なる場所ほど、色が濃くなります。' : 'まだピンはありません。QRコードから参加して、好きな場所をタップ。'))}</div>
        </section>
        <aside className="participation-panel">
          <div className="join-card"><span className="eyebrow">スマホで参加</span><h2>読み取って、<br />気持ちを教えてください。</h2><div className="qr-frame">{joinUrl && <QRCodeSVG value={joinUrl} size={208} level="M" fgColor="#254854" />}</div><p>カメラでQRコードを読み取るだけ。<br />名前の入力は必要ありません。</p><div className="join-link"><span>{joinUrl || '接続準備中…'}</span><button onClick={copyLink} disabled={!joinUrl} aria-label="参加用URLをコピー">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div><span className="network-note">{localOnly ? 'お試し中：このPCと同じWi-Fiで参加できます。' : '離れた場所からも、このURLで参加できます。'}</span></div>
          <a className="preview-link" href={roomUrl('join',room)} target="_blank" rel="noopener noreferrer"><span>このPCで回答を試す</span><ArrowUpRight size={21} /></a>
          <p className="preview-note">別タブで学生の画面が開きます</p>
        </aside>
      </div>
      <div className="host-dock" aria-label="主催者の操作" ref={dockRef} style={dockPos ? { left: dockPos.x, top: dockPos.y, bottom: 'auto', transform: 'none' } : undefined}><button type="button" className="host-dock-grip" aria-label="ドラッグして操作パネルを移動" title="ドラッグして移動" onPointerDown={onDockGripPointerDown} onPointerMove={onDockGripPointerMove} onPointerUp={onDockGripPointerUp} onPointerCancel={onDockGripPointerUp}><GripVertical size={18}/></button><button className="host-dock-main" disabled={!data || busy || mutating} onClick={()=>update('open')}>{data?.open ? '■ 受付を終了' : '▶ 回答を開始'}</button><div className="host-dock-icons"><button className="host-dock-icon" onClick={() => { setDraft(data?.question || QUESTION); setTitleDraft(data?.title || ''); setTitleMessage(''); setEditing(true); }} disabled={!data} aria-label="部屋と質問を編集" title="部屋と質問を編集"><Pencil size={19}/></button><button className="host-dock-icon" onClick={()=>update('visibility')} disabled={!data || busy} aria-label={data?.showAnswers === false ? '回答を表示する' : '回答を非表示にする'} title={data?.showAnswers === false ? '回答を表示する' : '回答を非表示にする'}>{data?.showAnswers === false ? <Eye size={20}/> : <EyeOff size={20}/>}</button><button className="host-dock-icon" onClick={() => setConfirm(true)} disabled={busy || !data || !total} aria-label="回答をリセット" title="回答をリセット"><RotateCcw size={19}/></button><div className="host-dock-icon-wrap" ref={toolsWrapRef}><button className="host-dock-icon" onClick={() => setToolsOpen(!toolsOpen)} aria-label="移動と設定" title="移動と設定"><SlidersHorizontal size={20}/></button>{toolsOpen && <div className="host-tools-popover is-anchored"><a href={roomUrl('editor',room)} className={data?.open ? 'is-blocked' : ''} aria-disabled={!!data?.open} onClick={(e) => { if (data?.open) e.preventDefault(); else setToolsOpen(false); }}><List size={17}/>質問一覧</a><a href={homeUrl} className={data?.open ? 'is-blocked' : ''} aria-disabled={!!data?.open} onClick={(e) => { if (data?.open) e.preventDefault(); else setToolsOpen(false); }}><Home size={17}/>部屋一覧・トップ</a><button onClick={() => { toggleFullscreen(); setToolsOpen(false); }}>{fullscreen?<Minimize size={17}/>:<Maximize size={17}/>}全画面表示</button>{data?.open && <div className="nav-blocked-note">受付中は画面を移動できません</div>}</div>}</div></div></div>
      {editing && <aside className="host-edit-panel" aria-label="部屋と質問を編集"><div className="host-edit-heading"><strong>部屋と質問を編集</strong><button className="icon-button" onClick={()=>setEditing(false)} aria-label="編集を閉じる"><X size={19}/></button></div>
        <form className="room-name-field" onSubmit={(e) => { e.preventDefault(); saveTitle(); }}>
          <label htmlFor="room-title-draft">部屋の名前</label>
          <div><input id="room-title-draft" value={titleDraft} maxLength={20} onChange={(e) => setTitleDraft(e.target.value)} /><button className="secondary-button" disabled={titleBusy || !titleDraft.trim()}>{titleBusy ? '保存中…' : '保存'}</button></div>
          <p className="field-note">{titleMessage || 'いつでも変更できます。トップ画面の一覧にもすぐに反映されます。'}</p>
        </form>
        <hr className="field-divider" />
        <form onSubmit={(e) => { e.preventDefault(); update('question'); }}>
          <label htmlFor="question-draft">質問文</label>
          <textarea id="question-draft" value={draft} maxLength={160} disabled={!!data?.open} onChange={(e) => setDraft(e.target.value)} />
          <p>{data?.open ? '受付中は質問を変更できません。先に受付を終了してください。' : '更新すると、現在の回答は新しい質問用に切り替わります。'}</p>
          {!data?.open && <a className="text-button" href={roomUrl('editor',room)}><SlidersHorizontal size={16}/>画面・詳細を設定</a>}
          <button className="primary-button" disabled={busy || !!data?.open || !draft.trim()}>{busy ? '更新中…' : '更新'}</button>
        </form>
      </aside>}
      <AlertDialog open={confirm} onOpenChange={(open) => { if (!busy) setConfirm(open); }}><AlertDialogContent><AlertDialogTitle>回答をリセットしますか？</AlertDialogTitle><AlertDialogDescription>今の{total}人分の回答を消して、同じ質問にもう一度回答できるようにします。</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={busy}>キャンセル</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={() => update('reset')}>{busy ? 'リセット中…' : 'リセットする'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}
