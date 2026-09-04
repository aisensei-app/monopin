import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getDatabase, ref, set, remove, get, update, onValue, runTransaction, serverTimestamp } from 'firebase/database';
import type { RoomAction, RoomState } from './room-service';

export type SavedRoom = { id: string; title: string; question: string; createdAt: number; expiresAt: number };
export type QuestionTemplate = 'mood' | 'world' | 'japan' | 'matrix' | 'free' | 'image';
export type RoomQuestion = { id: string; text: string; order: number; template?: QuestionTemplate; caption?: string; imageUrl?: string; layout?: string };
const ROOM_PLACEHOLDER = '質問を準備してください';
const ROOM_RETENTION_MS = 10 * 24 * 60 * 60 * 1000;
const MAX_SAVED_ROOMS = 3;

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
async function cleanSavedRooms(uid: string) {
  const {db} = services();
  const snapshot = await get(ref(db,`hostRooms/${uid}`));
  const now = Date.now();
  const all = Object.entries(snapshot.val() || {}).map(([id,value]) => ({id,...value as Omit<SavedRoom,'id'>}));
  const expired = all.filter(room => !room.expiresAt || room.expiresAt <= now);
  if (expired.length) {
    const changes: Record<string,null> = {};
    for (const room of expired) { changes[`hostRooms/${uid}/${room.id}`] = null; changes[`rooms/${room.id}`] = null; }
    await update(ref(db),changes);
  }
  return all.filter(room => room.expiresAt > now).sort((a,b) => b.createdAt - a.createdAt);
}
export async function getSavedRooms(): Promise<SavedRoom[]> {
  await loginHost();
  const user = await identity();
  return cleanSavedRooms(user.uid);
}
export async function deleteSavedRoom(room: string) {
  await loginHost();
  const user = await identity();
  await update(ref(services().db),{[`hostRooms/${user.uid}/${room}`]:null,[`rooms/${room}`]:null});
}
export async function createRoom(title: string) {
  await loginHost();
  const user = await identity();
  const {db} = services();
  const savedRooms = await cleanSavedRooms(user.uid);
  if (savedRooms.length >= MAX_SAVED_ROOMS) throw new Error('保存できる部屋は3件までです。不要な部屋を削除してから作成してください。');
  const room = crypto.randomUUID().replaceAll('-','').slice(0,24);
  const createdAt = Date.now();
  await update(ref(db),{
    [`rooms/${room}/meta`]:{owner:user.uid,title:title.trim(),question:ROOM_PLACEHOLDER,revision:1,open:false,createdAt:serverTimestamp()},
    [`hostRooms/${user.uid}/${room}`]:{title:title.trim(),question:ROOM_PLACEHOLDER,createdAt,expiresAt:createdAt + ROOM_RETENTION_MS},
  });
  return room;
}
export async function getRoomQuestions(room: string): Promise<RoomQuestion[]> {
  await loginHost();
  const snapshot = await get(ref(services().db,`roomQuestions/${room}`));
  return Object.entries(snapshot.val() || {}).map(([id,value]) => ({id,...value as Omit<RoomQuestion,'id'>})).sort((a,b)=>a.order-b.order);
}
export async function saveRoomQuestion(room: string, question: RoomQuestion) {
  await loginHost();
  await set(ref(services().db,`roomQuestions/${room}/${question.id}`),{text:question.text.trim(),order:question.order,template:question.template || 'mood',caption:question.caption?.trim() || '',imageUrl:question.imageUrl || '',layout:question.layout || ''});
}
export async function deleteRoomQuestion(room: string, id: string) {
  await loginHost();
  await remove(ref(services().db,`roomQuestions/${room}/${id}`));
}
export async function reorderRoomQuestions(room: string, questions: RoomQuestion[]) {
  await loginHost();
  const changes: Record<string,number>={};
  questions.forEach((question,index)=>{changes[`roomQuestions/${room}/${question.id}/order`]=index+1;});
  await update(ref(services().db),changes);
}
export async function changeRoom(room: string,action: RoomAction) {
  const user = await identity();
  const {db} = services();
  if (action.action === 'vote') {
    await set(ref(db,`rooms/${room}/pins/${action.revision}/${user.uid}`),{x:action.x,y:action.y,updatedAt:serverTimestamp()});
    return;
  }
  if (action.action === 'open') {
    await set(ref(db,`rooms/${room}/meta/open`), action.open);
    return;
  }
  const result = await runTransaction(ref(db,'rooms/'+room+'/meta'), current => {
    if (!current) return current;
    if (current.owner !== user.uid) return;
    if (action.action !== 'open' && current.revision !== action.revision) return;
    return {...current,question:action.action==='question'?action.question?.trim():current.question,revision:current.revision+1};
  },{applyLocally:false});
  if (!result.committed) throw new Error('質問が更新されたか、主催者としてログインしていません。');
  // Delete only the old revision: new answers arriving after reset remain intact.
  await remove(ref(db,`rooms/${room}/pins/${action.revision}`));
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

