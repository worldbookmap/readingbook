import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBookOpenReader,
  faCodeBranch,
  faGlobe,
  faNoteSticky,
} from "@fortawesome/free-solid-svg-icons";

const featureCards = [
  {
    href: "/characters",
    icon: faCodeBranch,
    eyebrow: "Character Studio",
    title: "소설 인물 관계도",
    description:
      "중심 인물을 만들고 친구, 부부, 자식, 사업, 기타 관계로 연결해 가며 사건 메모를 남기는 읽기용 마인드맵입니다.",
    accent: "from-orange-300 to-amber-200",
  },
  {
    href: "/timeline",
    icon: faGlobe,
    eyebrow: "History Atlas",
    title: "지역별 역사 연표",
    description:
      "서유럽, 동유럽, 아시아, 미국, 남미, 기타 지역으로 나눈 카드형 타임라인 보드입니다. 연도 카드 추가와 이동이 가능합니다.",
    accent: "from-sky-300 to-cyan-200",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#fff7ed_0%,_#fff_24%,_#eff6ff_100%)] text-slate-900">
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute right-10 top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />

        <section className="relative overflow-hidden rounded-[36px] border border-white/50 bg-white/70 px-6 py-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_380px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
                <FontAwesomeIcon icon={faBookOpenReader} />
                독서용 기록 웹앱
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                읽는 책의 인물과 역사 맥락을
                <span className="block text-orange-500">한 곳에 붙잡아 두는 워크스페이스</span>
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                소설 속 인물 관계도와 역사적 배경 연표를 나눠 관리하면서, 메모를 흐트러뜨리지 않고 이어서 독서할 수 있도록 설계한 웹앱입니다.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/characters"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  관계도 시작
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
                <Link
                  href="/timeline"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-600"
                >
                  연표 보드 열기
                  <FontAwesomeIcon icon={faArrowRight} />
                </Link>
              </div>
            </div>

          </div>
        </section>

        <section className="relative mt-8 grid gap-6 lg:grid-cols-2">
          {featureCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group overflow-hidden rounded-[32px] border border-white/50 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-1"
            >
              <div className={`inline-flex rounded-3xl bg-gradient-to-br ${card.accent} p-4 text-slate-950`}>
                <FontAwesomeIcon icon={card.icon} size="lg" />
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">{card.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">{card.title}</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{card.description}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition group-hover:text-orange-500">
                열어보기
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
            </Link>
          ))}
        </section>

        <section className="relative mt-8 rounded-[32px] border border-white/50 bg-white/70 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
                <FontAwesomeIcon icon={faNoteSticky} />
              </div>
              <h3 className="mt-4 text-xl font-semibold">읽으며 바로 적는 메모</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                인물 관계와 역사 사실을 한 화면에서 정리해서, 읽던 흐름을 끊지 않고 바로 이어 적을 수 있습니다.
              </p>
            </div>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                <FontAwesomeIcon icon={faCodeBranch} />
              </div>
              <h3 className="mt-4 text-xl font-semibold">관계와 사건을 함께 보기</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                인물은 관계망으로, 사건은 연표로 정리해 책 속 인물과 시대 배경을 함께 잡아둘 수 있습니다.
              </p>
            </div>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <FontAwesomeIcon icon={faGlobe} />
              </div>
              <h3 className="mt-4 text-xl font-semibold">책마다 새로 열어 쓰기</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                작품마다 다른 인물과 시대를 따로 정리하면서 필요한 순간에만 다시 꺼내 보기 좋습니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
