'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BOARD_ROOM as ROOM, type PinState } from '@/lib/pinboard';

export function usePinboard(participantId = '') {
  const [data, setData] = useState<PinState | null>(null);
  const [error, setError] = useState('');
  const paused = useRef(false);
  const serial = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++serial.current;
    try {
      const response = await fetch(`/api/pinboard?room=${ROOM}&participant=${encodeURIComponent(participantId)}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('connection');
      const next = await response.json() as PinState;
      if (serial.current === id) { setData(next); setError(''); }
    } catch {
      if (serial.current === id) setError('接続を確認しています。しばらくお待ちください。');
    }
  }, [participantId]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      if (!paused.current) await refresh();
      if (active) timer = setTimeout(tick, 1000);
    }
    tick();
    return () => { active = false; clearTimeout(timer); ++serial.current; };
  }, [refresh]);
  const mutate = async (body: Record<string, unknown>) => {
    paused.current = true;
    ++serial.current;
    try {
      const response = await fetch('/api/pinboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: ROOM, ...body }), signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(response.status === 409 ? '質問がリセットされました。もう一度ピンを置いてください。' : '送信できませんでした。接続を確認して、もう一度お試しください。');
    } finally {
      await refresh();
      paused.current = false;
    }
  };
  return { data, error, mutate };
}


