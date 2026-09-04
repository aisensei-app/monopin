export type Point = { x: number; y: number };
export type BoardPin = Point & { id: number | string };
export type PinState = { question: string; revision: number; pins: BoardPin[]; selected: BoardPin | null };
export const BOARD_ROOM = 'PINBOARD';

export function pointFromRect(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Point {
  return {
    x: Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)),
    y: Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100)),
  };
}
