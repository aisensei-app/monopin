'use client';
import { useEffect, useRef, useState } from 'react';
import { watchRoom, changeRoom, type RoomAction, type RoomState } from '@/lib/room-service';

export function useEventRoom(room: string) {
  const [data,setData] = useState<RoomState | null>(null);
  const [error,setError] = useState('');
  const [mutating,setMutating] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    setData(null); setError('');
    if (!room) return;
    return watchRoom(room, value => {setData(value);setError('');}, setError);
  },[room]);
  async function mutate(action: RoomAction) {
    if (busy.current) throw new Error('前の操作を送っています。');
    busy.current = true; setMutating(true);
    try { await changeRoom(room,{...action,revision:action.revision ?? data?.revision}); }
    finally {busy.current=false;setMutating(false);}
  }
  return {data,error,mutate,mutating};
}

