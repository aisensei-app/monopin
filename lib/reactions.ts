export const QUESTION = 'ここまでの内容、どのくらい分かりましたか？';
export const ROOM = 'DEMO';
export const choices = [
  { label: 'よく分かった', icon: 'laugh' },
  { label: 'だいたい分かった', icon: 'smile' },
  { label: '少しむずかしい', icon: 'meh' },
  { label: 'まだ分からない', icon: 'frown' },
] as const;
export type ReactionState = { question: string; revision: number; counts: number[]; selected: number | null; };

