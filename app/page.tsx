import Link from 'next/link';
import { ArrowRight, Presentation, Smartphone, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7d6_0,transparent_38%),linear-gradient(135deg,#f5fbff,#f4f0ff)] px-5 py-8 text-slate-900 sm:px-10 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl flex-col justify-between gap-12">
        <header className="flex items-center gap-3 font-bold tracking-tight">
          <span className="grid size-10 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Sparkles className="size-5" /></span>
          PinBoard
        </header>
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="mb-5 text-sm font-bold tracking-[.18em] text-violet-600">みんなの考えが、見える授業へ</p>
            <h1 className="text-balance text-5xl font-black leading-[1.08] tracking-[-.04em] sm:text-7xl">タップした場所に、<br /><span className="text-violet-600">意見が集まる。</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">QRコードで参加して、質問に対する自分の位置をタップ。クラス全員のピンがスクリーンにリアルタイムで広がります。</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/host" className="group rounded-[2rem] border border-white/80 bg-white/85 p-7 shadow-xl shadow-violet-100/60 backdrop-blur transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex items-start justify-between"><span className="grid size-14 place-items-center rounded-2xl bg-violet-600 text-white"><Presentation /></span><ArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-600" /></div>
              <h2 className="mt-8 text-2xl font-black">主催者として始める</h2><p className="mt-2 text-slate-500">質問とQRコードをスクリーンに表示</p>
            </Link>
            <Link href="/join?room=DEMO" className="group rounded-[2rem] border border-white/80 bg-white/70 p-7 shadow-lg shadow-sky-100/60 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between"><span className="grid size-14 place-items-center rounded-2xl bg-sky-500 text-white"><Smartphone /></span><ArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-500" /></div>
              <h2 className="mt-8 text-2xl font-black">参加して試す</h2><p className="mt-2 text-slate-500">スマホ画面でピンを置いてみる</p>
            </Link>
          </div>
        </section>
        <footer className="text-sm text-slate-400">授業用リアルタイム・リアクションボード</footer>
      </div>
    </main>
  );
}
