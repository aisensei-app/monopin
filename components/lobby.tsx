'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, MapPin, Plus } from 'lucide-react';
import { createRoom, roomUrl, cloudMode } from '@/lib/room-service';
import { QUESTION } from '@/lib/reactions';
import { Wordmark } from '@/components/wordmark';

export default function Lobby() {
  const [title,setTitle]=useState('');
  const [question,setQuestion]=useState(QUESTION);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [recent,setRecent]=useState('');
  useEffect(()=>{try{setRecent(localStorage.getItem('monopin-last-room')||'');}catch{}},[]);
  async function start(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try{
      const room=await createRoom(title,question);
      try{localStorage.setItem('monopin-last-room',room);}catch{}
      window.location.assign(roomUrl('host',room));
    }catch{setError(cloudMode?'ログインまたは部屋の作成に失敗しました。通信状態とFirebaseの設定をご確認ください。':'部屋を作れませんでした。接続を確認してもう一度お試しください。');setBusy(false);}
  }
  return <main className="lobby-shell">
    <header className="student-header"><Wordmark /><span className="eyebrow">{cloudMode?'オンラインでつながる':'手元で試す'}</span></header>
    <section className="lobby-card"><div className="lobby-icon"><MapPin size={28}/></div><h1>みんなが集まる<br/>部屋をつくりましょう。</h1><p>授業も、オンライン研修も。<br/>参加者はQRコードやURLから、すぐにピンを置けます。</p>
      <form onSubmit={start}><label htmlFor="room-title">授業・研修会の名前</label><input id="room-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：9月のオンライン研修" maxLength={80} required disabled={busy}/>
      <label htmlFor="room-question">最初の質問</label><textarea id="room-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={160} required disabled={busy}/>
      {cloudMode&&<p className="form-note">主催者はGoogleでログインします。参加者の登録は不要です。</p>}
      <button className="primary-button create-room-button" disabled={busy||!title.trim()||!question.trim()}><Plus size={19}/>{busy?'部屋を準備しています…':'新しい部屋をつくる'}<ArrowRight size={20}/></button>
      <div role="status" className="form-error">{error}</div></form>
      {recent&&<button className="text-button" onClick={()=>window.location.assign(roomUrl('host',recent))}>前回の主催者画面に戻る <ArrowRight size={16}/></button>}
    </section>
  </main>;
}

