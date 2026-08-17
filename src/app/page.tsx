"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen, faClock, faDiagramProject, faListCheck } from "@fortawesome/free-solid-svg-icons";
import packageJson from "../../package.json";

const pageLinks = [
  { href: "/characters", label: "인물관계도", icon: faDiagramProject },
  { href: "/story-events", label: "사건 타임라인", icon: faClock },
  { href: "/timeline", label: "역사 연표", icon: faListCheck },
  { href: "/keywords", label: "키워드맵", icon: faBookOpen },
];

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      router.replace("/characters");
    }, 1800);

    return () => window.clearTimeout(redirectTimer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] px-6 text-slate-900">
      <section className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-amber-200/80 bg-white text-2xl shadow-[0_12px_30px_rgba(120,83,45,0.1)]">
          <span aria-hidden="true">📖</span>
        </div>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-700">
          Reading Book
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
          읽기의 흐름을 준비하고 있어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          잠시만 기다려 주세요.
        </p>
        <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-amber-100">
          <div className="h-full w-1/2 animate-[loading_1.8s_ease-in-out_infinite] rounded-full bg-amber-500" />
        </div>
        <nav aria-label="페이지 바로가기" className="mt-7 flex w-full items-center justify-center gap-2">
          {pageLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/80 bg-white/65 text-slate-600 shadow-[0_8px_18px_rgba(120,83,45,0.08)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-amber-700 active:scale-95"
            >
              <FontAwesomeIcon icon={icon} className="text-sm" />
            </Link>
          ))}
        </nav>
        <Link
          href="/characters"
          className="mt-6 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
        >
          바로 시작하기
        </Link>
        <p className="mt-5 text-[10px] font-medium tracking-[0.16em] text-slate-400">
          VERSION {packageJson.version}
        </p>
      </section>
    </main>
  );
}
