import { Laugh, Smile, Meh, Frown } from 'lucide-react';
const faces = [Laugh, Smile, Meh, Frown];
export function ReactionFace({ choice, className = '' }: { choice: number; className?: string }) {
  const Icon = faces[choice] || Smile;
  return <span className={`reaction-face ${className}`}><Icon aria-hidden="true" strokeWidth={1.5} /></span>;
}

