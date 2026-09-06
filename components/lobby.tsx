'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Copy, MapPin, Plus, Settings, Trash2 } from 'lucide-react';
import { createRoom, deleteSavedRoom, getSavedRooms, roomUrl, cloudMode, type SavedRoom } from '@/lib/room-service';
import { Wordmark } from '@/components/wordmark';
import { trackEvent } from '@/components/analytics';
import { AccountMenu } from '@/components/account-menu';

type Screen = 'start' | 'new' | 'history';
function dateLabel(value: number) {
  return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'short',day:'numeric'}).format(value);
}

export default function Lobby() {
  const [title,setTitle]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [screen,setScreen]=useState<Screen>('start');
  const [savedRooms,setSavedRooms]=useState<SavedRoom[]>([]);
  const [loadingRooms,setLoadingRooms]=useState(false);
  const [selectedRoom,setSelectedRoom]=useState<SavedRoom|null>(null);
  const [loginIntent,setLoginIntent]=useState<'create'|'history'|null>(null);
  async function createNewRoom() {
    setBusy(true);setError('');
    try{
      const room=await createRoom(title);
      trackEvent('create_room');
      try{localStorage.setItem('monopin-last-room',room);}catch{}
      window.location.assign(roomUrl('editor',room));
    }catch(err){setError(err instanceof Error ? err.message : '部屋を作れませんでした。接続を確認してもう一度お試しください。');setBusy(false);}
  }
  async function start(event:React.FormEvent) {
    event.preventDefault();
    if(cloudMode){
      const service=await import('@/lib/firebase-room-service');
      if(!await service.isHostLoggedIn()){setLoginIntent('create');return;}
    }
    await createNewRoom();
  }
  async function loadHistory() {
    setScreen('history');setSelectedRoom(null);setError('');
    if (!cloudMode) { setError('過去の部屋の保存は、公開版で利用できます。'); return; }
    setLoadingRooms(true);
    try { setSavedRooms(await getSavedRooms()); }
    catch { setError('過去の部屋を読み込めませんでした。Googleログインと接続を確認してください。'); }
    finally { setLoadingRooms(false); }
  }
  async function openHistory() {
    if(cloudMode){
      const service=await import('@/lib/firebase-room-service');
      if(!await service.isHostLoggedIn()){setLoginIntent('history');return;}
    }
    await loadHistory();
  }
  async function confirmLogin() {
    const intent=loginIntent;
    if(!intent)return;
    setBusy(true);setError('');
    try {
      await (await import('@/lib/firebase-room-service')).loginHost();
      setLoginIntent(null);setBusy(false);
      if(intent==='create')await createNewRoom();else await loadHistory();
    } catch { setError('Googleログインを完了できませんでした。もう一度お試しください。');setBusy(false); }
  }
  async function removeRoom(room:SavedRoom) {
    if (!window.confirm(`「${room.title}」を削除しますか？\n質問・回答・参加用URLも使えなくなります。`)) return;
    setBusy(true);setError('');
    try { await deleteSavedRoom(room.id); setSavedRooms(items=>items.filter(item=>item.id!==room.id)); setSelectedRoom(current=>current?.id===room.id?null:current); }
    catch { setError('削除できませんでした。接続を確認して、もう一度お試しください。'); }
    finally { setBusy(false); }
  }
  function copyRoom(room:SavedRoom) {
    trackEvent('copy_saved_room');
    setTitle(`${room.title}（コピー）`);setSelectedRoom(null);setScreen('new');setError('');
  }
  return <main className="lobby-shell">
    <header className="student-header"><Wordmark /><div className="student-header-actions"><span className="eyebrow">{cloudMode?'Powered by AI Sensei':'手元で試す'}</span><AccountMenu/></div></header>
    <section className="lobby-card">
      <div className="lobby-icon"><MapPin size={28}/></div>
      <h1>みんなが集まる<br/>部屋をつくりましょう。</h1>
      <p>授業も、オンライン研修も。<br/>参加者はQRコードやURLから、すぐにピンを置けます。</p>

      {screen==='start' && <div className="lobby-start-actions">
        {cloudMode&&<p className="host-login-note"><strong>主催者はGoogleログインが必要です</strong><span>部屋の作成を確定するとき、または過去の部屋を開くときに、Googleのログイン画面が表示されます。参加者はログイン不要です。</span></p>}
        <button className="primary-button lobby-choice" onClick={()=>{setScreen('new');setError('');}}><Plus size={20}/>新しい部屋をつくる<ArrowRight size={20}/></button>
        <button className="secondary-button lobby-choice" onClick={openHistory}><Copy size={19}/>過去の部屋を再利用する<ArrowRight size={20}/></button>
      </div>}

      {screen==='new' && <><button className="back-button" type="button" onClick={()=>{setScreen('start');setError('');}}><ArrowLeft size={17}/>選び直す</button>
        <form onSubmit={start}><label htmlFor="room-title">新しい部屋の名前</label><input id="room-title" autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：9月のオンライン研修" maxLength={20} required disabled={busy}/>
        {cloudMode&&<p className="form-note">次の画面で質問を追加します。部屋は10日間保存され、最大3件まで残せます。</p>}
        <button className="primary-button create-room-button" disabled={busy||!title.trim()}><Plus size={19}/>{busy?'部屋を準備しています…':'部屋をつくる'}<ArrowRight size={20}/></button></form></>}

      {screen==='history' && <><button className="back-button" type="button" onClick={()=>{setScreen('start');setSelectedRoom(null);setError('');}}><ArrowLeft size={17}/>選び直す</button>
        <div className="room-history-heading"><strong>過去の部屋</strong><span>最大3件・作成から10日間</span></div>
        {loadingRooms ? <p className="history-message">過去の部屋を読み込んでいます…</p> : savedRooms.length===0 ? <p className="history-message">保存されている部屋はありません。新しい部屋をつくると、ここから再利用できます。</p> : <div className="room-history-list">{savedRooms.map(room=><article className={`room-history-item ${selectedRoom?.id===room.id?'is-selected':''}`} key={room.id}>
          <button className="room-history-main" type="button" onClick={()=>setSelectedRoom(room)}><strong>{room.title}</strong><span>{room.question}</span><small>{dateLabel(room.createdAt)} 作成</small></button>
          <div className="room-history-actions" aria-label={`「${room.title}」の操作`}>
            <a className="room-action-button" href={roomUrl('editor',room.id)} onClick={()=>trackEvent('open_saved_room')} aria-label={`「${room.title}」の質問一覧を開く`} title="質問一覧"><Settings size={18}/></a>
            <button className="room-action-button" type="button" onClick={()=>copyRoom(room)} aria-label={`「${room.title}」をコピーして使う`} title="コピー"><Copy size={18}/></button>
            <button className="room-action-button is-delete" type="button" disabled={busy} onClick={()=>removeRoom(room)} aria-label={`「${room.title}」を削除`} title="削除"><Trash2 size={18}/></button>
          </div>
        </article>)}</div>}
        </>}
      <div role="status" className="form-error">{error}</div>
    </section>
    {loginIntent&&<div className="login-dialog-backdrop" role="presentation"><section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title"><h2 id="login-title">主催者としてログイン</h2><p>主催者機能を利用するには、Googleアカウントでのログインが必要です。</p><small>Googleアカウントは、部屋の作成・管理に使用します。参加者のログインは必要ありません。</small><div><button type="button" className="text-button" disabled={busy} onClick={()=>setLoginIntent(null)}>キャンセル</button><button type="button" className="primary-button" disabled={busy} onClick={confirmLogin}>{busy?'ログイン中…':'Googleでログイン'}</button></div></section></div>}
  </main>;
}
