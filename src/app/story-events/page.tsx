import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { StoryEventTimeline } from "@/components/story-event-timeline";

export default function StoryEventsPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-950"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          홈으로
        </Link>

        <section className="mb-8 mt-6 rounded-[32px] border border-slate-300/80 bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,0.04)] sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">
                Story Timeline
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
                소설 속 사건을 흐름으로 정리하는 보드
              </h1>
            </div>
            <div className="max-w-xl rounded-[24px] border border-slate-300 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
              소설의 핵심 사건들을 카드로 놓고 흐름을 따라 읽어보세요.
            </div>
          </div>
        </section>

        <StoryEventTimeline />
      </div>
    </main>
  );
}
