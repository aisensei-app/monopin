import { MapPin } from 'lucide-react';

type WordmarkProps = {
  href?: string;
};

function WordmarkText() {
  return <>
    <span className="wordmark-mono">mono</span>
    <span className="wordmark-pin">p<span className="wordmark-i" aria-hidden="true"><MapPin className="wordmark-i-dot" viewBox="2 1 20 21" strokeWidth={1.8} /></span>n</span>
    <span className="brand-dot" />
  </>;
}

export function Wordmark({ href }: WordmarkProps) {
  return href
    ? <a href={href} className="wordmark" aria-label="monopin"><WordmarkText /></a>
    : <span className="wordmark" aria-label="monopin"><WordmarkText /></span>;
}
