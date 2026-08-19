"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import packageJson from "../../package.json";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      router.replace("/characters");
    }, 1800);

    return () => window.clearTimeout(redirectTimer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-slate-900">
      <section className="flex w-full max-w-sm flex-col items-center rounded-[28px] border border-[#1e3038]/15 bg-[#fffdf9]/90 p-8 text-center shadow-[0_22px_55px_rgba(45,43,37,0.1)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#d99a70]/70 bg-[#b86b3d] text-2xl text-white shadow-[0_12px_30px_rgba(120,83,45,0.16)]">
          <span aria-hidden="true">R</span>
        </div>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#b86b3d]">
          Reading Book
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[#1e3038]">
          읽기의 흐름을 준비하고 있어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          잠시만 기다려 주세요.
        </p>
        <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-[#f2dfd0]">
          <div className="h-full w-1/2 animate-[loading_1.8s_ease-in-out_infinite] rounded-full bg-[#b86b3d]" />
        </div>
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
