import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getDatabase, ref, set, remove, onValue, runTransaction, serverTimestamp } from 'firebase/database';
import type { RoomAction, RoomState } from './room-service';

const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '';
function services() {
  if (!raw) throw new Error('Firebaseの接続設定がありません。');
  const app = getApps()[0] || initializeApp(JSON.parse(raw));
  return { auth: getAuth(app), db: getDatabase(app) };
}
let signingIn: Promise<unknown> | undefined;
async function identity() {
  const {auth} = services();
  await auth.authStateReady();
  if (!auth.currentUser) {
    signingIn ||= signInAnonymously(auth).finally(() => { signingIn = undefined; });
    await signingIn;
  }
  return auth.currentUser!;
}
export async function loginHost() {
  const {auth} = services();
  await auth.authStateReady();
  if (!auth.currentUser || auth.currentUser.isAnonymous) await signInWithPopup(auth,new GoogleAuthProvider());
}
export async function createRoom(title: string,question: string) {
  await loginHost();
  const user = await identity();
  const {db} = services();
  const room = crypto.randomUUID().replaceAll('-','').slice(0,24);
  await set(ref(db,'rooms/'+room+'/meta'),{owner:user.uid,title:title.trim(),question:question.trim(),revision:1,open:true,createdAt:serverTimestamp()});
  return room;
}
export async function changeRoom(room: string,action: RoomAction) {
  const user = await identity();
  const {db} = services();
  if (action.action === 'vote') {
    await set(ref(db,`rooms/${room}/pins/${action.revision}/${user.uid}`),{x:action.x,y:action.y,updatedAt:serverTimestamp()});
    return;
  }
  const result = await runTransaction(ref(db,'rooms/'+room+'/meta'), current => {
    if (!current) return current;
    if (current.owner !== user.uid) return;
    if (action.action !== 'open' && current.revision !== action.revision) return;
    if (action.action === 'open') return {...current,open:action.open};
    return {...current,question:action.action==='question'?action.question?.trim():current.question,revision:current.revision+1};
  },{applyLocally:false});
  if (!result.committed) throw new Error('質問が更新されたか、主催者としてログインしていません。');
  if (action.action !== 'open') {
    // Delete only the old revision: new answers arriving after reset remain intact.
    await remove(ref(db,`rooms/${room}/pins/${action.revision}`));
  }
}
export async function watchRoom(room: string,onData:(data:RoomState)=>void,onError:(message:string)=>void) {
  const user = await identity();
  const {db} = services();
  let stopPins: (()=>void) | undefined;
  let stopped = false;
  let version = 0;
  let connected = false;
  let latest: RoomState | undefined;
  const emit = () => {if(!stopped && connected && latest)onData(latest);};
  const stopConnection=onValue(ref(db,'.info/connected'),snapshot=>{
    connected=!!snapshot.val();
    if(connected)emit();else if(!stopped)onError('接続を確認しています。再接続すると自動で反映されます。');
  });
  const stopMeta=onValue(ref(db,'rooms/'+room+'/meta'),snapshot=>{
    stopPins?.();
    const ticket=++version;
    const meta=snapshot.val();
    if(!meta){onError('この部屋は見つかりません。参加用URLを確認してください。');return;}
    const isHost=meta.owner===user.uid;
    latest=undefined;
    const path=`rooms/${room}/pins/${meta.revision}`+(isHost?'':'/'+user.uid);
    stopPins=onValue(ref(db,path),pinsSnapshot=>{
      if(stopped||ticket!==version)return;
      const value=pinsSnapshot.val();
      const selected=isHost?(value?.[user.uid]?{...value[user.uid],id:user.uid}:null):(value?{...value,id:user.uid}:null);
      latest={title:meta.title,question:meta.question,revision:meta.revision,open:meta.open,isHost,
        pins:isHost?Object.entries(value||{}).map(([id,point])=>({...point as {x:number;y:number},id})):[],selected};
      emit();
    },()=>onError('ピンの読み込みに失敗しました。参加用URLやログイン状態を確認してください。'));
  },()=>onError('部屋を開けません。接続設定とログイン状態を確認してください。'));
  return ()=>{stopped=true;stopMeta();stopPins?.();stopConnection();};
}

