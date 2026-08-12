import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBookOpenReader,
  faCodeBranch,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";

const featureCards = [
  {
    href: "/characters",
    icon: faCodeBranch,
    eyebrow: "Character Studio",
    title: "소설 인물 관계도",
    description:
      "중심 인물을 만들고 친구, 부부, 자식, 사업, 기타 관계로 연결해 가며 사건 메모를 남기는 읽기용 마인드맵입니다.",
    accent: "from-slate-100 to-white",
  },
  {
    href: "/timeline",
    icon: faGlobe,
    eyebrow: "History Atlas",
    title: "세계사 역사 연표",
    description:
      "서유럽, 동유럽, 아시아, 미국, 남미, 기타 지역으로 나눈 카드형 타임라인 보드입니다. 연도 카드 추가와 이동이 가능합니다.",
    accent: "from-slate-100 to-white",
  },
  {
    href: "/story-events",
    icon: faBookOpenReader,
    eyebrow: "Story Pulse",
    title: "소설 사건 타임라인",
    description:
      "소설마다 핵심 사건을 드래그 가능한 카드로 정리하고 겹쳐지는 흐름까지 자연스럽게 보관할 수 있습니다.",
    accent: "from-amber-50 to-white",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f5f3] text-slate-900">
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-300/70 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.04),_transparent_32%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_320px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-600">
                <FontAwesomeIcon icon={faBookOpenReader} />
                독서용 기록 웹앱
              </div>

              <h1 className="mt-6 max-w-4xl text-[2.2rem] font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl lg:text-6xl">
                책읽을 때 필요한 것들
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                필요해서 만들어보았다
              </p>

              <div className="mt-8 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:gap-3 [&::-webkit-scrollbar]:hidden">
                <Link
                  href="/characters"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[11px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 sm:px-5 sm:py-3 sm:text-sm"
                >
                  관계도 시작
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
                <Link
                  href="/timeline"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-950 sm:px-5 sm:py-3 sm:text-sm"
                >
                  연표 보드 열기
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
                <Link
                  href="/story-events"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-amber-50 px-4 py-2.5 text-[11px] font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100 sm:px-5 sm:py-3 sm:text-sm"
                >
                  사건 타임라인
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-8 grid gap-5 lg:grid-cols-2">
          {featureCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group overflow-hidden rounded-[28px] border border-slate-300/80 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition duration-300 hover:-translate-y-1 hover:border-slate-400 hover:shadow-[0_16px_42px_rgba(0,0,0,0.06)]"
            >
              <div className={`inline-flex rounded-[20px] bg-gradient-to-br ${card.accent} p-4 text-slate-950`}>
                <FontAwesomeIcon icon={card.icon} size="lg" />
              </div>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:text-sm">{card.eyebrow}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-2xl">{card.title}</h2>
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
