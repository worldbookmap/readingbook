import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import characterSeed from "@/data/character-map.json";
import { CharacterMapClient } from "@/components/character-map-client";
import { CharacterSeed } from "@/lib/types";

export default function CharactersPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff8ef_0%,_#f8fafc_38%,_#eef6ff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 backdrop-blur transition hover:border-orange-300 hover:text-orange-600"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          홈으로
        </Link>

        <section className="mb-8 mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-orange-500">Reader Workspace</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              인물 관계와 행동 메모를
              <br />
              한 화면에서 정리합니다.
            </h1>
          </div>
          <div className="max-w-xl rounded-[28px] border border-white/50 bg-white/70 p-5 text-sm leading-7 text-slate-600 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            한 인물을 중심으로 연결 인물을 계속 추가하고, 관계 유형과 직접 입력 라벨까지 남길 수 있습니다.
            메모는 브라우저에 저장되어 읽는 흐름을 끊지 않습니다.
          </div>
        </section>

        <CharacterMapClient seed={characterSeed as CharacterSeed} />
      </div>
    </main>
  );
}