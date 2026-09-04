import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'monopin｜理解度チェック',
  description: 'ボードの好きな場所にピンを置いて、今の気持ちを共有しましょう。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}


