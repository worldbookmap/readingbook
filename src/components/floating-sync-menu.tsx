"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faHouse, faRotate } from "@fortawesome/free-solid-svg-icons";

type Props = {
  saveMessage: string;
  onRefresh: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
};

export function FloatingSyncMenu({ saveMessage, onRefresh, onSave }: Props) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex justify-center md:inset-x-auto md:right-6 md:bottom-6">
      <div className="flex items-center gap-2 rounded-[30px] border border-white/70 bg-white/35 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <Link
          href="/"
          aria-label="홈으로 이동"
          title="홈으로 이동"
          className="flex h-11 w-11 items-center justify-center rounded-[19px] border border-white/70 bg-white/45 text-slate-700 shadow-[0_8px_20px_rgba(255,255,255,0.32)] transition hover:-translate-y-0.5 hover:bg-white/70 active:scale-95"
        >
          <FontAwesomeIcon icon={faHouse} />
        </Link>
        <button
          type="button"
          onClick={() => void onRefresh()}
          aria-label={`GitHub 내용 새로 불러오기 (${saveMessage})`}
          title="GitHub 내용 새로 불러오기"
          className="flex h-11 w-11 items-center justify-center rounded-[19px] border border-white/70 bg-white/45 text-slate-700 shadow-[0_8px_20px_rgba(255,255,255,0.32)] transition hover:-translate-y-0.5 hover:bg-white/70 active:scale-95"
        >
          <FontAwesomeIcon icon={faRotate} />
        </button>
        <button
          type="button"
          onClick={() => void onSave()}
          aria-label={`현재 변경사항을 GitHub에 저장 (${saveMessage})`}
          title="현재 변경사항을 GitHub에 저장"
          className="flex h-11 w-11 items-center justify-center rounded-[19px] bg-slate-900/85 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 active:scale-95"
        >
          <FontAwesomeIcon icon={faCloudArrowUp} />
        </button>
      </div>
    </div>
  );
}
