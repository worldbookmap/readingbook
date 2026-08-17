import Link from "next/link";
import { KeywordMindmap } from "@/components/keyword-mindmap";

export default function KeywordsPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3] px-2 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700 sm:text-xs">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">R</span>
            Reading Book
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/characters" className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">관계도</Link>
            <Link href="/story-events" className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">타임라인</Link>
            <Link href="/timeline" className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">연표</Link>
            <Link href="/keywords" className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/10" style={{ color: "#ffffff" }}>키워드맵</Link>
          </div>
        </nav>

        <section className="mb-6 mt-5 rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),rgba(248,245,240,0.95))] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-700">
                Keyword Atlas
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl lg:text-5xl">
                핵심 키워드 연결 지도
              </h1>
            </div>
            <div className="max-w-xl rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
              책의 핵심 단어를 연결하며 읽고 기억하는 방식으로, 관계와 의미를 한 번에 정리하세요.
            </div>
          </div>
        </section>

        <KeywordMindmap />
      </div>
    </main>
  );
}
