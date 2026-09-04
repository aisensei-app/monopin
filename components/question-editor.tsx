'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { Wordmark } from '@/components/wordmark';
import { cloudMode, roomFromLocation, roomUrl, type SavedRoom } from '@/lib/room-service';
import { trackEvent } from '@/components/analytics';
import type { RoomQuestion } from '@/lib/firebase-room-service';

export default function QuestionEditor() {
  const [room,setRoom]=useState(''); const [title,setTitle]=useState('');
  const [questions,setQuestions]=useState<RoomQuestion[]>([]); const [draft,setDraft]=useState('');
  const [editing,setEditing]=useState<string|null>(null); const [adding,setAdding]=useState(false); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  useEffect(()=>{const code=roomFromLocation(); setRoom(code); if(!code||!cloudMode)return;
    Promise.all([import('@/lib/firebase-room-service'),import('@/lib/room-service')]).then(async([service,rooms])=>{
      const saved=(await rooms.getSavedRooms() as SavedRoom[]).find(item=>item.id===code); setTitle(saved?.title||'新しい部屋'); setQuestions(await service.getRoomQuestions(code));
    }).catch(()=>setMessage('質問を読み込めませんでした。接続を確認してください。'));
  },[]);
  async function refresh(){const service=await import('@/lib/firebase-room-service');setQuestions(await service.getRoomQuestions(room));}
  async function save(){if(!draft.trim()||!room)return;setBusy(true);setMessage('');try{const service=await import('@/lib/firebase-room-service');const existing=questions.find(q=>q.id===editing);await service.saveRoomQuestion(room,{id:editing||crypto.randomUUID().replaceAll('-','').slice(0,12),text:draft,order:existing?.order||questions.length+1});setDraft('');setEditing(null);setAdding(false);await refresh();}catch{setMessage('保存できませんでした。もう一度お試しください。');}finally{setBusy(false);}}
  async function remove(id:string){if(!confirm('この質問を削除しますか？'))return;setBusy(true);try{const service=await import('@/lib/firebase-room-service');await service.deleteRoomQuestion(room,id);await refresh();}catch{setMessage('削除できませんでした。もう一度お試しください。');}finally{setBusy(false);}}
  async function move(index:number,direction:-1|1){const target=index+direction;if(target<0||target>=questions.length)return;const next=[...questions];[next[index],next[target]]=[next[target],next[index]];setQuestions(next);try{const service=await import('@/lib/firebase-room-service');await service.reorderRoomQuestions(room,next);}catch{setMessage('順番を変更できませんでした。');await refresh();}}
  if(!room)return <main className="student-shell"><p>部屋を作成してから質問を準備してください。</p></main>;
  return <main className="editor-shell"><header className="student-header"><Wordmark href={roomUrl('home')}/><span className="eyebrow">Powered by AI Sensei</span></header><section className="editor-card"><a className="back-button" href={roomUrl('home')}><ArrowLeft size={17}/>部屋一覧</a><h1>{title||'質問を準備'}</h1><p className="editor-intro">質問を追加して、授業中に順番に開始できます。</p><div className="editor-heading"><strong>質問</strong><button className="secondary-button" onClick={()=>{setEditing(null);setDraft('');setAdding(true)}}><Plus size={17}/>質問を追加</button></div>{(editing!==null||adding)&&<form className="question-form" onSubmit={e=>{e.preventDefault();save();}}><label htmlFor="question-text">質問文</label><textarea id="question-text" autoFocus value={draft} maxLength={160} onChange={e=>setDraft(e.target.value)} placeholder="参加者に聞きたいことを入力"/><div><button type="button" className="text-button" onClick={()=>{setEditing(null);setAdding(false);setDraft('');}}>キャンセル</button><button className="primary-button" disabled={busy||!draft.trim()}>{editing?'更新':'追加'}</button></div></form>}<div className="prepared-questions">{questions.length===0?<p className="history-message">まだ質問はありません。「質問を追加」から準備しましょう。</p>:questions.map((question,index)=><article className="prepared-question" key={question.id}><div className="question-order"><GripVertical size={17}/><span>{index+1}</span></div><strong>{question.text}</strong><div className="question-actions"><button aria-label="上へ移動" disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button aria-label="下へ移動" disabled={index===questions.length-1} onClick={()=>move(index,1)}>↓</button><button aria-label="編集" onClick={()=>{setAdding(false);setEditing(question.id);setDraft(question.text)}}><Pencil size={16}/></button><button aria-label="削除" onClick={()=>remove(question.id)}><Trash2 size={16}/></button></div></article>)}</div><a className="primary-button editor-start" href={roomUrl('host',room)} onClick={()=>trackEvent('open_saved_room')}>主催者画面を開く <Copy size={17}/></a><p role="status" className="form-error">{message}</p></section></main>;
}
