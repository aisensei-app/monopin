'use client';
import { useEffect,useState } from 'react';
import HostPage from './host/page';
import JoinPage from './join/page';
import Lobby from '@/components/lobby';
import QuestionEditor from '@/components/question-editor';
export default function AppPage() {
  const [view,setView]=useState<string|null>(null);
  useEffect(()=>{setView(new URLSearchParams(window.location.search).get('view')||'home');},[]);
  if(view===null)return <main className="student-shell"><p role="status">画面を準備しています…</p></main>;
  return view==='host'?<HostPage/>:view==='join'?<JoinPage/>:view==='editor'?<QuestionEditor/>:<Lobby/>;
}

