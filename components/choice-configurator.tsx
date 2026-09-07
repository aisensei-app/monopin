'use client';
import { Minus, Plus } from 'lucide-react';
import { CharCounter } from '@/components/char-counter';

export const defaultChoiceOptions: string[] = [
  'カード1', 'カード2', 'カード3', 'カード4', 'カード5', 'カード6', 'カード7', 'カード8',
];
export const defaultChoiceOptionsFor = (count: 4 | 6 | 8): string[] =>
  defaultChoiceOptions.slice(0, count);
export function parseChoiceOptions(layout?: string): string[] {
  if (!layout) return defaultChoiceOptionsFor(4);
  try {
    const value = JSON.parse(layout);
    if (value && Array.isArray(value.options) && value.options.every((o: unknown) => typeof o === 'string')) {
      return value.options as string[];
    }
  } catch {}
  return defaultChoiceOptionsFor(4);
}
export function ChoiceConfigurator({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const count = options.length;
  const setCount = (next: number) =>
    onChange(
      next > count
        ? [...options, ...defaultChoiceOptions.slice(count, next)]
        : options.slice(0, next),
    );
  const edit = (index: number, value: string) =>
    onChange(options.map((option, i) => (i === index ? value : option)));
  return (
    <section className="choice-configurator">
      <div className="mood-count">
        <strong>分割数</strong>
        <div>
          <button type="button" disabled={count <= 4} onClick={() => setCount(count - 2)}>
            <Minus size={16} />
          </button>
          <span>{count}</span>
          <button type="button" disabled={count >= 8} onClick={() => setCount(count + 2)}>
            <Plus size={16} />
          </button>
        </div>
      </div>
      <p>4・6・8個から選べます。参加者はこの中から1枚のカードにピンを置いて選びます。</p>
      <div className="choice-option-list">
        {options.map((option, index) => (
          <div className="field-with-counter" key={index}>
            <input
              aria-label={`${index + 1}枚目のカード`}
              value={option}
              maxLength={50}
              placeholder={`カード${index + 1}`}
              onChange={(e) => edit(index, e.target.value)}
            />
            <CharCounter value={option} max={50} />
          </div>
        ))}
      </div>
    </section>
  );
}

