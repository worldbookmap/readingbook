import Link from "next/link";
import { KeywordMindmap } from "@/components/keyword-mindmap";

export default function KeywordsPage() {
  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="archive-nav flex items-center justify-between rounded-[20px] px-3 py-2.5 sm:px-4">
          <Link href="/" className="archive-brand inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] sm:text-xs">
            <span className="archive-mark inline-flex h-7 w-7 items-center justify-center rounded-lg text-[10px]">R</span>
            Reading Book
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/characters" className="archive-nav-link rounded-xl px-3 py-2 text-xs font-medium transition">관계도</Link>
            <Link href="/story-events" className="archive-nav-link rounded-xl px-3 py-2 text-xs font-medium transition">타임라인</Link>
            <Link href="/timeline" className="archive-nav-link rounded-xl px-3 py-2 text-xs font-medium transition">연표</Link>
            <Link href="/keywords" className="archive-nav-link-active rounded-xl px-3 py-2 text-xs font-semibold">키워드맵</Link>
          </div>
        </nav>

        <section className="archive-hero mb-6 mt-5 rounded-[28px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="archive-eyebrow">
                Keyword Atlas
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-[#1e3038] sm:text-4xl lg:text-5xl">
                핵심 키워드 연결 지도
              </h1>
            </div>
            <div className="archive-note max-w-xl pl-4 text-sm leading-6 lg:max-w-[320px]">
              책의 핵심 단어를 연결하며 읽고 기억하는 방식으로, 관계와 의미를 한 번에 정리하세요.
            </div>
          </div>
        </section>

        <KeywordMindmap />
      </div>
    </main>
  );
}
