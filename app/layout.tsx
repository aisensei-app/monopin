import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pinboard-classroom-jp.sites.openai.com'),
  title: 'PinBoard｜みんなの考えが見える授業へ',
  description: 'QRコードで参加し、タップした位置をリアルタイムで共有する授業用アプリ',
  openGraph: {
    title: 'PinBoard｜みんなの考えが見える授業へ',
    description: 'QRコードで参加し、タップした位置をリアルタイムで共有する授業用アプリ',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PinBoard｜みんなの考えが見える授業へ',
    description: 'QRコードで参加し、タップした位置をリアルタイムで共有する授業用アプリ',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
