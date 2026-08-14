import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBookOpenReader,
  faCodeBranch,
  faGlobe,
  faProjectDiagram,
} from "@fortawesome/free-solid-svg-icons";
import characterMapLibrary from "@/data/character-map.json";
import storyEventLibrary from "@/data/story-event-library.json";
import timelineLibrary from "@/data/timeline.json";

const featureCards = [
  {
    href: "/characters",
    icon: faCodeBranch,
    eyebrow: "Character Studio",
    title: "소설 인물 관계도",
    description:
      "중심 인물을 만들고 친구, 부부, 자식, 사업, 기타 관계로 연결해 가며 사건 메모를 남기는 읽기용 마인드맵입니다.",
    accent: "from-stone-100 via-white to-rose-50",
  },
  {
    href: "/story-events",
    icon: faBookOpenReader,
    eyebrow: "Story Pulse",
    title: "소설 사건 타임라인",
    description:
      "소설마다 핵심 사건을 드래그 가능한 카드로 정리하고 겹쳐지는 흐름까지 자연스럽게 보관할 수 있습니다.",
    accent: "from-amber-50 via-white to-orange-50",
  },
  {
    href: "/timeline",
    icon: faGlobe,
    eyebrow: "History Atlas",
    title: "세계사 역사 연표",
    description:
      "서유럽, 동유럽, 아시아, 미국, 남미, 기타 지역으로 나눈 카드형 타임라인 보드입니다. 연도 카드 추가와 이동이 가능합니다.",
    accent: "from-slate-100 via-white to-stone-50",
  },
  {
    href: "/keywords",
    icon: faProjectDiagram,
    eyebrow: "Keyword Atlas",
    title: "핵심 키워드 연결 지도",
    description:
      "책의 주요 키워드를 노드로 만들고, 각 연결에 의미를 적으며 정리하는 마인드맵으로 독서 핵심을 시각화합니다.",
    accent: "from-violet-100 via-white to-fuchsia-50",
  },
];

const journeySteps = [
  {
    number: "01",
    title: "인물 정리",
    description: "주요 인물을 맵처럼 정리해 관계와 속성을 한눈에 보세요.",
  },
  {
    number: "02",
    title: "사건 연결",
    description: "핵심 사건을 타임라인으로 이어가며 이야기의 흐름을 잡아보세요.",
  },
  {
    number: "03",
    title: "기록 완성",
    description: "언제든 다시 꺼내볼 수 있게 연표와 관계도까지 함께 남깁니다.",
  },
];

export default function Home() {
  const characterMapCount = characterMapLibrary.works.length;
  const storyEventCount = storyEventLibrary.works.length;
  const timelineEventCount = timelineLibrary.cards.length;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f3ee] text-slate-900">
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 pb-6 pt-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(255,255,255,0.96)_0%,_rgba(250,248,245,0.94)_52%,_rgba(245,240,232,0.9)_100%)] px-5 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-white/70 sm:px-7 sm:py-8 lg:px-10 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_28%)]" />
          <div className="absolute -left-20 top-10 h-52 w-52 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-40 w-40 rounded-full bg-stone-200/70 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_360px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:text-sm">
                <FontAwesomeIcon icon={faBookOpenReader} className="text-amber-600" />
                독서용 기록 웹앱
              </div>

              <h1 className="mt-5 max-w-4xl text-[2.2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl lg:text-[3.8rem]">
                읽는 흐름을
                <span className="block text-slate-700">더 선명하게 남기다</span>
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">
                인물 관계, 핵심 사건, 역사 맥락까지 한 곳에서 정리하면서
                <span className="font-medium text-slate-800"> 책을 읽는 감각을 더 오래 남기세요.</span>
              </p>

              <div className="mt-7 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3 [&::-webkit-scrollbar]:hidden">
                <Link
                  href="/characters"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.10)] ring-1 ring-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 sm:px-5 sm:py-3 sm:text-sm"
                  style={{ color: "#ffffff" }}
                >
                  관계도 시작
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
                <Link
                  href="/story-events"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] font-semibold text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100 sm:px-5 sm:py-3 sm:text-sm"
                >
                  사건 타임라인
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
                <Link
                  href="/timeline"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 text-[11px] font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 sm:px-5 sm:py-3 sm:text-sm"
                >
                  연표 보드 열기
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
                <Link
                  href="/keywords"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2.5 text-[11px] font-semibold text-violet-700 transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100 sm:px-5 sm:py-3 sm:text-sm"
                >
                  키워드맵
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[26px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Reading flow</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900">오늘의 독서 루틴</h2>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    Active
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>인물관계도</span>
                      <span>작품수</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-700">
                      <span>{characterMapCount}개</span>
                      <span>작품</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500" style={{ width: `${Math.min(100, characterMapCount * 30)}%` }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>주요 사건</span>
                      <span>작품수</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-700">
                      <span>{storyEventCount}개</span>
                      <span>작품</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" style={{ width: `${Math.min(100, storyEventCount * 35)}%` }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>연표 정리</span>
                      <span>총 사건수</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-700">
                      <span>{timelineEventCount}건</span>
                      <span>사건</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-stone-500 via-slate-500 to-slate-700" style={{ width: `${Math.min(100, timelineEventCount * 15)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-6 rounded-[28px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-5">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">How it works</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-2xl">1, 2, 3으로 정리하는 독서 기록</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {journeySteps.map((step) => (
              <div
                key={step.number}
                className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8f8f6_100%)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {step.number}
                  </span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative mt-6 grid gap-4 lg:grid-cols-3">
          {featureCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <div className={`inline-flex rounded-[22px] bg-gradient-to-br ${card.accent} p-4 text-slate-900 shadow-inner shadow-white/40`}>
                <FontAwesomeIcon icon={card.icon} size="lg" />
              </div>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:text-xs">{card.eyebrow}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.7rem]">{card.title}</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{card.description}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-900 transition group-hover:text-slate-600 sm:text-sm">
                열어보기
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
