import type { Metadata } from "next";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

config.autoAddCss = false;

export const metadata: Metadata = {
  title: "Reading Book",
  description: "독서 중 인물 관계와 역사 연표를 정리하는 리딩 도구",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className="bg-[#f5f3ee] text-slate-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>

          <footer className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(248,245,240,0.92))] backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1.5 px-4 py-4 text-center text-[11px] text-slate-500 sm:flex-row sm:gap-5 sm:text-[12px]">
              <span className="font-medium tracking-[-0.02em] text-slate-700">제작자: 정진욱</span>
              <a
                href="mailto:rootack@gmail.com"
                className="transition hover:text-slate-900"
              >
                이메일: rootack@gmail.com
              </a>
              <a
                href="https://brunch.co.kr/@rootack"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-slate-900"
              >
                블로그: https://brunch.co.kr/@rootack
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
