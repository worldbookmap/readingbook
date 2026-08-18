"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faHouse, faRotate } from "@fortawesome/free-solid-svg-icons";

type Props = { saveMessage: string; onRefresh: () => void | Promise<void>; onSave: () => void | Promise<void> };

export function FloatingSyncMenu({ saveMessage, onRefresh, onSave }: Props) {
	return (
		<div className="fixed inset-x-3 bottom-3 z-40 flex justify-center md:inset-x-auto md:right-6 md:bottom-6">
			<div className="flex items-center gap-1.5 rounded-[24px] border border-white/45 bg-white/20 p-1.5 backdrop-blur-xl">
				<Link href="/" aria-label="홈으로 이동" title="홈으로 이동" className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-white/25 text-xs text-slate-700"><FontAwesomeIcon icon={faHouse} /></Link>
				<button type="button" onClick={() => void onRefresh()} aria-label={`GitHub 내용 새로 불러오기 (${saveMessage})`} title="GitHub 내용 새로 불러오기" className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-white/25 text-xs text-slate-700"><FontAwesomeIcon icon={faRotate} /></button>
				<button type="button" onClick={() => void onSave()} aria-label={`현재 변경사항을 GitHub에 저장 (${saveMessage})`} title="현재 변경사항을 GitHub에 저장" className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-slate-900/65 text-xs text-white"><FontAwesomeIcon icon={faCloudArrowUp} /></button>
			</div>
		</div>
	);
}
