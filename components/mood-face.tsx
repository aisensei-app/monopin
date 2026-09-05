import type { MoodPoint, MoodPreset } from '@/components/mood-configurator';

const faceShape: Record<
  MoodPreset,
  { eyes: 'down' | 'flat' | 'round' | 'up'; mouth: 'sad' | 'soft-sad' | 'flat' | 'soft-smile' | 'smile' }
> = {
  distressed: { eyes: 'down', mouth: 'sad' },
  sad: { eyes: 'down', mouth: 'soft-sad' },
  uneasy: { eyes: 'flat', mouth: 'soft-sad' },
  tired: { eyes: 'flat', mouth: 'flat' },
  neutral: { eyes: 'round', mouth: 'flat' },
  calm: { eyes: 'round', mouth: 'soft-smile' },
  happy: { eyes: 'up', mouth: 'smile' },
  energetic: { eyes: 'up', mouth: 'smile' },
};

export function MoodSymbol({ point }: { point: MoodPoint }) {
  if (point.emoji.trim()) {
    return <span className="mood-emoji">{point.emoji}</span>;
  }
  const preset = point.preset || 'neutral';
  const shape = faceShape[preset];
  return (
    <span className={`mood-face mood-face-${preset}`} aria-hidden="true">
      <span className={`mood-face-eyes is-${shape.eyes}`}>
        <i />
        <i />
      </span>
      <span className={`mood-face-mouth is-${shape.mouth}`} />
    </span>
  );
}
