import type { PinState } from './pinboard';
export type RoomState = PinState & { title: string; layout?: string; template?: string; soundEnabled?: boolean; open: boolean; showAnswers?: boolean; isHost: boolean; currentQuestionId?: string; ended?: boolean };
export type RoomAction = { action: 'vote' | 'reset' | 'question' | 'open' | 'visibility' | 'title' | 'switch-question' | 'ended'; x?: number; y?: number; question?: string; open?: boolean; visible?: boolean; revision?: number; title?: string; direction?: 'prev' | 'next'; ended?: boolean };
export type { SavedRoom, RoomQuestion } from './firebase-room-service';
export const cloudMode = process.env.NEXT_PUBLIC_ROOM_BACKEND === 'firebase';

export function roomUrl(view: 'home' | 'host' | 'join' | 'editor', room = '', forSharing = false) {
  const url = new URL(window.location.href);
  if (!cloudMode) url.pathname = url.pathname.replace(/\/(host|join)\/?$/, '/');
  url.search = ''; url.hash = '';
  if (view !== 'home') url.searchParams.set('view', view);
  if (room) url.searchParams.set('room', room);
  if (forSharing && !cloudMode && process.env.NEXT_PUBLIC_JOIN_ORIGIN) {
    const lan = new URL(process.env.NEXT_PUBLIC_JOIN_ORIGIN);
    url.hostname = lan.hostname; url.port = lan.port; url.protocol = lan.protocol;
  }
  return url.toString();
}
export function roomFromLocation() {
  const room = new URLSearchParams(window.location.search).get('room') || '';
  return /^[a-f0-9]{24}$/.test(room) ? room : '';
}
async function localRequest(body: object) {
  const response = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const data = await response.json() as { error?: string; room: string };
  if (!response.ok) throw new Error(data.error || '操作できませんでした。もう一度お試しください。');
  return data;
}
export async function loginHost() {
  if (cloudMode) await (await import('./firebase-room-service')).loginHost();
}
export async function createRoom(title: string): Promise<string> {
  if (cloudMode) return (await import('./firebase-room-service')).createRoom(title);
  return (await localRequest({ action: 'create', title, question: '質問を準備してください' })).room;
}
export async function getSavedRooms() {
  if (!cloudMode) return [];
  return (await import('./firebase-room-service')).getSavedRooms();
}
export async function getRoomQuestions(room: string) {
  if (!cloudMode) return [];
  return (await import('./firebase-room-service')).getRoomQuestions(room);
}
export async function deleteSavedRoom(room: string) {
  if (!cloudMode) return;
  await (await import('./firebase-room-service')).deleteSavedRoom(room);
}
export async function changeRoom(room: string, action: RoomAction) {
  if (cloudMode) return (await import('./firebase-room-service')).changeRoom(room,action);
  await localRequest({room, ...action});
  const response = await fetch('/api/sessions?room=' + room, {cache:'no-store',signal:AbortSignal.timeout(7000)});
  if (!response.ok) throw new Error('送信後の確認ができませんでした。接続を確認してください。');
  const state = await response.json();
  window.dispatchEvent(new CustomEvent('monopin-room-refresh',{detail:{room,state}}));
}
export function watchRoom(room: string, onData: (value: RoomState) => void, onError: (message: string) => void) {
  let stopped = false;
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout>;
  if (cloudMode) {
    import('./firebase-room-service').then(async service => {
      if (stopped) return;
      const release = await service.watchRoom(room, (value) => { if (!stopped) onData(value); }, (message) => { if (!stopped) onError(message); });
      if (stopped) release(); else unsubscribe = release;
    }).catch(() => { if (!stopped) onError('公開先に接続できません。設定や通信状態を確認してください。'); });
  } else {
    let sequence = 0;
    const poll = async () => {
      const current = ++sequence;
      try {
        const response = await fetch('/api/sessions?room=' + room, {cache:'no-store',signal:AbortSignal.timeout(7000)});
        const value = await response.json() as RoomState & { error?: string };
        if (!response.ok) throw new Error(value.error);
        if (!stopped && current === sequence) onData(value);
      } catch (error) { if (!stopped && current === sequence) onError(error instanceof Error && !['Failed to fetch','fetch failed'].includes(error.message) ? error.message : '接続を確認しています。'); }
      if (!stopped && current === sequence) timer = setTimeout(poll, 1000);
    };
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{room:string;state:RoomState}>).detail;
      if (detail.room !== room || stopped) return;
      ++sequence; clearTimeout(timer); onData(detail.state);
      timer = setTimeout(poll,1000);
    };
    window.addEventListener('monopin-room-refresh',update);
    unsubscribe = () => window.removeEventListener('monopin-room-refresh',update);
    poll();
  }
  return () => { stopped = true; clearTimeout(timer); unsubscribe?.(); };
}
