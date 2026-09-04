'use client';
import { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, RefreshCw, User } from 'lucide-react';
import { cloudMode } from '@/lib/room-service';

export function AccountMenu() {
  const [open,setOpen]=useState(false);
  const [loggedIn,setLoggedIn]=useState(false);
  const [busy,setBusy]=useState(false);
  const [confirmKind,setConfirmKind]=useState<'login'|'switch'|null>(null);
  const wrap=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!cloudMode)return;
    import('@/lib/firebase-room-service').then(service=>service.isHostLoggedIn()).then(setLoggedIn).catch(()=>{});
    const close=(event:MouseEvent)=>{if(!wrap.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',close);
    return()=>document.removeEventListener('pointerdown',close);
  },[]);
  if(!cloudMode)return null;
  async function act(kind:'login'|'switch'|'logout') {
    setBusy(true);
    try {
      const service=await import('@/lib/firebase-room-service');
      if(kind==='login')await service.loginHost();
      if(kind==='switch')await service.switchHostAccount();
      if(kind==='logout')await service.logoutHost();
      setLoggedIn(kind!=='logout');setOpen(false);
      if(kind!=='login')window.location.assign(window.location.pathname);
    } finally { setBusy(false); }
  }
  return <div className="account-menu-wrap" ref={wrap}>
    <button type="button" className="account-icon-button" aria-label="アカウントメニュー" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><User size={19}/></button>
    {open&&<div className="account-popover">
      <small>{loggedIn?'主催者としてログイン中':'ログインしていません'}</small>
      {loggedIn?<>
        <button type="button" disabled={busy} onClick={()=>{setOpen(false);setConfirmKind('switch');}}><RefreshCw size={16}/>Googleアカウントを変更</button>
        <button type="button" disabled={busy} onClick={()=>act('logout')}><LogOut size={16}/>ログアウト</button>
      </>:<button type="button" disabled={busy} onClick={()=>{setOpen(false);setConfirmKind('login');}}><LogIn size={16}/>主催者としてログイン</button>}
    </div>}
    {confirmKind&&<div className="login-dialog-backdrop" role="presentation"><section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="account-login-title"><h2 id="account-login-title">{confirmKind==='switch'?'Googleアカウントを変更':'主催者としてログイン'}</h2><p>{confirmKind==='switch'?'現在のアカウントからログアウトして、別のGoogleアカウントでログインします。':'主催者機能を利用するには、Googleアカウントでのログインが必要です。'}</p><small>Googleアカウントは、部屋の作成・管理に使用します。参加者のログインは必要ありません。</small><div><button type="button" className="text-button" disabled={busy} onClick={()=>setConfirmKind(null)}>キャンセル</button><button type="button" className="primary-button" disabled={busy} onClick={async()=>{const kind=confirmKind;setConfirmKind(null);await act(kind);}}>{confirmKind==='switch'?'アカウントを変更':'Googleでログイン'}</button></div></section></div>}
  </div>;
}
