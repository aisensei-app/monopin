'use client';

export function CharCounter({ value, max }: { value: string; max: number }) {
  const count = [...value].length;
  const near = count >= Math.ceil(max * 0.8);
  return (
    <span className={`char-counter${near ? ' is-near' : ''}`}>
      {count}/{max}
    </span>
  );
}

