type WordmarkProps = {
  href?: string;
};

function WordmarkText() {
  return <>
    <span className="wordmark-mono">mono</span>
    <span className="wordmark-pin">pin</span>
    <span className="brand-dot" />
  </>;
}

export function Wordmark({ href }: WordmarkProps) {
  return href
    ? <a href={href} className="wordmark" aria-label="monopin"><WordmarkText /></a>
    : <span className="wordmark" aria-label="monopin"><WordmarkText /></span>;
}
