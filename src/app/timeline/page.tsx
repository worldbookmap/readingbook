import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import timelineSeed from "@/data/timeline.json";
import { TimelineBoard } from "@/components/timeline-board";
import { TimelineCard } from "@/lib/types";

export default function TimelinePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f4fbff_0%,_#f8fafc_40%,_#fff7ed_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 backdrop-blur transition hover:border-sky-300 hover:text-sky-600"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          홈으로
        </Link>

        <section className="mb-8 mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-500">History Desk</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              지역별 역사 사실을
              <br />
              카드 보드로 정리합니다.
            </h1>
          </div>
          <div className="max-w-xl rounded-[28px] border border-white/50 bg-white/70 p-5 text-sm leading-7 text-slate-600 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            BC 3000부터 주요 시점을 시드 데이터로 넣어두고, 읽는 책의 맥락에 맞게 사건 카드를 지역 간에 이동시키거나 수정할 수 있습니다.
          </div>
        </section>

        <TimelineBoard initialCards={timelineSeed.cards as TimelineCard[]} />
      </div>
    </main>
  );
}