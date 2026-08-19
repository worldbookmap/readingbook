import Link from "next/link";
import timelineSeed from "@/data/timeline.json";
import { TimelineBoard } from "@/components/timeline-board";
import { TimelineCard } from "@/lib/types";

export default function TimelinePage() {
  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between rounded-[20px] border border-[#1e3038]/15 bg-[#1e3038] px-3 py-2.5 text-white shadow-[0_18px_40px_rgba(30,48,56,0.16)] sm:px-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white sm:text-xs">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#d99a70]/70 bg-[#b86b3d] text-[10px] text-white shadow-inner">R</span>
            Reading Book
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/characters" className="rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">관계도</Link>
            <Link href="/story-events" className="rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">타임라인</Link>
            <Link href="/timeline" className="rounded-xl bg-[#f4e4d7] px-3 py-2 text-xs font-semibold text-[#1e3038] shadow-[0_6px_16px_rgba(0,0,0,0.12)]">연표</Link>
            <Link href="/keywords" className="rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">키워드맵</Link>
          </div>
        </nav>

        <section className="relative mb-6 mt-5 overflow-hidden rounded-[28px] border border-[#1e3038]/15 bg-[linear-gradient(120deg,_rgba(255,255,255,0.94),rgba(241,233,221,0.92))] p-6 shadow-[0_22px_55px_rgba(45,43,37,0.1)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute right-[-5%] top-[-35%] h-80 w-80 rounded-full border-[28px] border-[#b86b3d]/10" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b86b3d]">
                <span className="h-px w-8 bg-[#b86b3d]" />
                History Desk
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-[#1e3038] sm:text-4xl lg:text-5xl">
                복잡한 연도와 사건 정리
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">흩어진 사건을 지역과 시간의 결로 다시 읽는 개인 역사 아카이브</p>
            </div>
            <div className="max-w-xl border-l-2 border-[#b86b3d]/60 pl-4 text-sm leading-6 text-slate-600 lg:max-w-[260px]">
              외우면 까먹는 세계사의 주요 사건들은 연도별로 정리
            </div>
          </div>
        </section>

        <TimelineBoard initialCards={timelineSeed.cards as TimelineCard[]} />
      </div>
    </main>
  );
}