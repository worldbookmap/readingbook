import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import characterMapLibrary from "@/data/character-map.json";
import { CharacterMapClient } from "@/components/character-map-client";
import { CharacterMapLibrary } from "@/lib/types";

export default async function CharactersPage({
  searchParams,
}: {
  searchParams?: Promise<{ workId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="archive-nav flex items-center justify-between rounded-[20px] px-3 py-2.5 sm:px-4">
          <Link href="/" className="archive-brand inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] sm:text-xs">
            <span className="archive-mark inline-flex h-7 w-7 items-center justify-center rounded-lg text-[10px]">R</span>
            Reading Book
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/characters" className="archive-nav-link-active rounded-xl px-3 py-2 text-xs font-semibold">관계도</Link>
            <Link href="/story-events" className="archive-nav-link rounded-xl px-3 py-2 text-xs font-medium transition">타임라인</Link>
            <Link href="/timeline" className="archive-nav-link rounded-xl px-3 py-2 text-xs font-medium transition">연표</Link>
            <Link href="/keywords" className="archive-nav-link rounded-xl px-3 py-2 text-xs font-medium transition">키워드맵</Link>
          </div>
        </nav>

        <section className="archive-hero relative mb-6 mt-5 overflow-hidden rounded-[28px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="archive-eyebrow">
                Reader Workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-[#1e3038] sm:text-4xl lg:text-5xl">
                소설 속 인물들의 관계
              </h1>
            </div>
            <div className="archive-note max-w-xl pl-4 text-sm leading-6 lg:max-w-[260px]">
              복잡한 인물관계를 좀 정리하면서 읽어보자.
            </div>
          </div>
        </section>

        <CharacterMapClient
          library={characterMapLibrary as CharacterMapLibrary}
          defaultWorkId={resolvedParams?.workId}
        />
      </div>
    </main>
  );
}