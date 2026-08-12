"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faCalendarDays,
  faCloudArrowUp,
  faGripVertical,
  faLink,
  faPlus,
  faRotateLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { StoryEventCard, StoryTimelineLibrary, StoryTimelineWork } from "@/lib/types";
import characterMapLibrary from "@/data/character-map-library.json";
import storyEventLibrary from "@/data/story-event-library.json";

const storageKey = "readingbook-story-event-library";
const boardWidth = 1100;
const boardHeight = 560;
const cardWidth = 220;
const cardHeight = 150;
const eventPalette = ["#f59e0b", "#0f766e", "#2563eb", "#7c3aed", "#ef4444", "#f97316"];

type WorkDraft = {
  title: string;
  author: string;
  linkedCharacterWorkId: string;
};

type EventDraft = {
  title: string;
  yearLabel: string;
  chapter: string;
  summary: string;
  tags: string;
};

const defaultWorkDraft: WorkDraft = {
  title: "",
  author: "",
  linkedCharacterWorkId: "",
};

const defaultEventDraft: EventDraft = {
  title: "",
  yearLabel: "",
  chapter: "",
  summary: "",
  tags: "",
};

function parseYear(yearLabel: string) {
  const cleaned = yearLabel.trim().toUpperCase();
  if (cleaned.startsWith("BC")) {
    const numeric = Number(cleaned.replace("BC", "").trim());
    return Number.isNaN(numeric) ? 0 : -numeric;
  }

  const numeric = Number(cleaned);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getYearPosition(year: number, minYear: number, maxYear: number) {
  const range = maxYear - minYear || 1;
  return 80 + ((year - minYear) / range) * (boardWidth - 180);
}

function buildInitialWorks(): StoryTimelineWork[] {
  return (storyEventLibrary as StoryTimelineLibrary).works;
}

export function StoryEventTimeline() {
  const [works, setWorks] = useState<StoryTimelineWork[]>(buildInitialWorks);
  const [selectedWorkId, setSelectedWorkId] = useState<string>(buildInitialWorks()[0]?.id ?? "");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(buildInitialWorks()[0]?.events[0]?.id ?? null);
  const [workDraft, setWorkDraft] = useState<WorkDraft>(defaultWorkDraft);
  const [eventDraft, setEventDraft] = useState<EventDraft>(defaultEventDraft);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("브라우저 로컬 저장 사용 중");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteSha, setRemoteSha] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const characterWorks = (characterMapLibrary as { works?: Array<{ id: string; title: string; titleKo?: string }> }).works ?? [];

  const selectedWork = works.find((work) => work.id === selectedWorkId) ?? works[0] ?? null;
  const selectedEvent = selectedWork?.events.find((event) => event.id === selectedEventId) ?? selectedWork?.events[0] ?? null;

  const linkedCharacterWork =
    characterWorks.find((work) => work.id === selectedWork?.linkedCharacterWorkId) ??
    characterWorks.find((work) => {
      const title = selectedWork?.titleKo ?? selectedWork?.title ?? "";
      return (
        work.title.toLowerCase().includes(title.toLowerCase()) ||
        (work.titleKo ?? "").toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes((work.titleKo ?? work.title).toLowerCase())
      );
    }) ??
    null;

  const yearBounds = useMemo(() => {
    const years = selectedWork?.events.map((event) => event.year) ?? [];
    if (years.length === 0) {
      return { min: 0, max: 1 };
    }

    return {
      min: Math.min(...years),
      max: Math.max(...years),
    };
  }, [selectedWork]);

  const chapterGroups = useMemo(() => {
    const groups = new Map<string, StoryEventCard[]>();
    for (const event of selectedWork?.events ?? []) {
      const chapterKey = event.chapter?.trim() || "기타";
      const items = groups.get(chapterKey) ?? [];
      items.push(event);
      groups.set(chapterKey, items);
    }

    return Array.from(groups.entries()).map(([chapter, events]) => ({
      chapter,
      events: [...events].sort((left, right) => left.year - right.year),
    }));
  }, [selectedWork]);

  const eventConnections = useMemo(() => {
    if (!selectedWork || selectedWork.events.length < 2) {
      return [] as Array<{ fromId: string; toId: string; fromX: number; fromY: number; toX: number; toY: number }>; 
    }

    const sorted = [...selectedWork.events].sort((left, right) => left.year - right.year || left.title.localeCompare(right.title, "ko"));
    return sorted.slice(1).map((event, index) => {
      const previous = sorted[index];
      return {
        fromId: previous.id,
        toId: event.id,
        fromX: previous.x + cardWidth / 2,
        fromY: previous.y + cardHeight / 2,
        toX: event.x + cardWidth / 2,
        toY: event.y + cardHeight / 2,
      };
    });
  }, [selectedWork]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as StoryTimelineLibrary;
      if (parsed.works?.length) {
        setWorks(parsed.works);
        setSelectedWorkId(parsed.works[0].id);
        setSelectedEventId(parsed.works[0].events[0]?.id ?? null);
      }
    } catch {
      // ignore invalid local cache
    }
  }, []);

  useEffect(() => {
    if (!selectedWork) {
      return;
    }

    const fallbackMatch = characterWorks.find((work) => {
      const workTitle = selectedWork.titleKo ?? selectedWork.title;
      return (
        work.title.toLowerCase().includes(workTitle.toLowerCase()) ||
        (work.titleKo ?? "").toLowerCase().includes(workTitle.toLowerCase()) ||
        workTitle.toLowerCase().includes((work.titleKo ?? work.title).toLowerCase())
      );
    });

    if (!selectedWork.linkedCharacterWorkId && fallbackMatch) {
      setWorks((current) =>
        current.map((work) =>
          work.id === selectedWork.id
            ? { ...work, linkedCharacterWorkId: fallbackMatch.id }
            : work,
        ),
      );
    }
  }, [characterWorks, selectedWork]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify({ works }));
  }, [works]);

  const didMount = useRef(false);

  useEffect(() => {
    if (!selectedWork || !selectedWork.events.length) {
      setSelectedEventId(null);
      return;
    }

    if (!selectedWork.events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(selectedWork.events[0].id);
    }
  }, [selectedWork, selectedEventId]);

  function addWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = workDraft.title.trim();
    if (!title) {
      return;
    }

    const matchedCharacter = characterWorks.find((work) => {
      const normalized = title.toLowerCase();
      return [work.title, work.titleKo ?? ""].some((entry) => entry.toLowerCase().includes(normalized));
    });

    const nextWork: StoryTimelineWork = {
      id: crypto.randomUUID(),
      title,
      titleKo: title,
      author: workDraft.author.trim() || "새 소설",
      linkedCharacterWorkId: matchedCharacter?.id ?? (workDraft.linkedCharacterWorkId || undefined),
      events: [],
    };

    setWorks((current) => [...current, nextWork]);
    setSelectedWorkId(nextWork.id);
    setSelectedEventId(null);
    setWorkDraft(defaultWorkDraft);
  }

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWork || !eventDraft.title.trim() || !eventDraft.yearLabel.trim()) {
      return;
    }

    const nextIndex = selectedWork.events.length;
    const year = parseYear(eventDraft.yearLabel);
    const xRange = boardWidth - cardWidth - 100;
    const yRange = boardHeight - cardHeight - 80;

    const nextEvent: StoryEventCard = {
      id: crypto.randomUUID(),
      title: eventDraft.title.trim(),
      year,
      yearLabel: eventDraft.yearLabel.trim(),
      chapter: eventDraft.chapter.trim() || `챕터 ${nextIndex + 1}`,
      summary: eventDraft.summary.trim() || "사건 설명을 입력해 주세요.",
      tags: eventDraft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      x: clamp(80 + (nextIndex % 4) * 200 + (nextIndex % 2) * 30, 30, xRange),
      y: clamp(70 + Math.floor(nextIndex / 4) * 160, 30, yRange),
      color: eventPalette[nextIndex % eventPalette.length],
    };

    setWorks((current) =>
      current.map((work) =>
        work.id === selectedWork.id
          ? {
              ...work,
              events: [...work.events, nextEvent],
            }
          : work,
      ),
    );
    setSelectedEventId(nextEvent.id);
    setEventDraft(defaultEventDraft);
  }

  function updateSelectedEvent<T extends keyof StoryEventCard>(field: T, value: StoryEventCard[T]) {
    if (!selectedEvent || !selectedWork) {
      return;
    }

    setWorks((current) =>
      current.map((work) => {
        if (work.id !== selectedWork.id) {
          return work;
        }

        return {
          ...work,
          events: work.events.map((event) => {
            if (event.id !== selectedEvent.id) {
              return event;
            }

            if (field === "tags") {
              return {
                ...event,
                tags: Array.isArray(value) ? value : [],
              };
            }

            if (field === "yearLabel") {
              return {
                ...event,
                yearLabel: String(value),
                year: parseYear(String(value)),
              };
            }

            return {
              ...event,
              [field]: value,
            };
          }),
        };
      }),
    );
  }

  function deleteSelectedEvent() {
    if (!selectedEvent || !selectedWork) {
      return;
    }

    setWorks((current) =>
      current.map((work) =>
        work.id === selectedWork.id
          ? {
              ...work,
              events: work.events.filter((event) => event.id !== selectedEvent.id),
            }
          : work,
      ),
    );
  }

  function deleteSelectedWork() {
    if (!selectedWork) {
      return;
    }

    const nextWorks = works.filter((work) => work.id !== selectedWork.id);
    setWorks(nextWorks);
    setSelectedWorkId(nextWorks[0]?.id ?? "");
    setSelectedEventId(nextWorks[0]?.events[0]?.id ?? null);
  }

  function resetWorks() {
    const defaults = buildInitialWorks();
    setWorks(defaults);
    setSelectedWorkId(defaults[0]?.id ?? "");
    setSelectedEventId(defaults[0]?.events[0]?.id ?? null);
    window.localStorage.removeItem(storageKey);
  }

  function beginDrag(event: React.PointerEvent<HTMLButtonElement>, cardId: string) {
    if (!selectedWork) {
      return;
    }

    const card = selectedWork.events.find((item) => item.id === cardId);
    const board = boardRef.current;
    if (!card || !board) {
      return;
    }

    const rect = board.getBoundingClientRect();
    dragRef.current = {
      id: cardId,
      offsetX: event.clientX - rect.left - card.x,
      offsetY: event.clientY - rect.top - card.y,
    };

    setSelectedEventId(cardId);
    event.preventDefault();

    const handleMove = (moveEvent: PointerEvent) => {
      if (!dragRef.current || dragRef.current.id !== cardId) {
        return;
      }

      const nextX = clamp(
        moveEvent.clientX - rect.left - dragRef.current.offsetX,
        24,
        boardWidth - cardWidth - 24,
      );
      const nextY = clamp(
        moveEvent.clientY - rect.top - dragRef.current.offsetY,
        24,
        boardHeight - cardHeight - 24,
      );

      setWorks((current) =>
        current.map((work) => {
          if (work.id !== selectedWork.id) {
            return work;
          }

          return {
            ...work,
            events: work.events.map((item) =>
              item.id === cardId
                ? {
                    ...item,
                    x: nextX,
                    y: nextY,
                  }
                : item,
            ),
          };
        }),
      );
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }

  async function saveToGithub() {
    setSaveState("saving");
    setSaveMessage(remoteEnabled ? "GitHub에 저장 중..." : "환경변수 확인 필요");

    try {
      const response = await fetch("/api/story-events", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ works, sha: remoteSha }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "GitHub save failed");
      }

      const payload = (await response.json()) as { ok: true; sha: string };
      setSaveState("saved");
      setRemoteSha(payload.sha);
      setSaveMessage("GitHub 저장소에 반영되었습니다.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "GitHub 저장에 실패했습니다.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <section className="rounded-[28px] border border-slate-300/80 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <FontAwesomeIcon icon={faBookOpen} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">소설 관리</p>
              <h2 className="text-xl font-semibold text-slate-900">새 작품 추가</h2>
            </div>
          </div>

          <form className="mt-5 space-y-3" onSubmit={addWork}>
            <input
              value={workDraft.title}
              onChange={(event) => setWorkDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="소설 제목"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
            />
            <input
              value={workDraft.author}
              onChange={(event) => setWorkDraft((current) => ({ ...current, author: event.target.value }))}
              placeholder="작가명(선택)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
            />
            <select
              value={workDraft.linkedCharacterWorkId}
              onChange={(event) =>
                setWorkDraft((current) => ({ ...current, linkedCharacterWorkId: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
            >
              <option value="">인물관계도와 연결하지 않음</option>
              {characterWorks.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.titleKo ?? work.title}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <FontAwesomeIcon icon={faPlus} />
              소설 추가
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-300/80 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">현재 작품</p>
              <h3 className="text-xl font-semibold text-slate-900">{selectedWork?.titleKo ?? selectedWork?.title ?? "작품 없음"}</h3>
            </div>
            <button
              type="button"
              onClick={resetWorks}
              className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              작품 선택
            </label>
            <select
              value={selectedWorkId}
              onChange={(event) => setSelectedWorkId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-300"
            >
              {works.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.titleKo ?? work.title}
                </option>
              ))}
            </select>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FontAwesomeIcon icon={faLink} className="text-amber-600" />
                인물관계도 연결
              </div>
              <select
                value={selectedWork?.linkedCharacterWorkId ?? ""}
                onChange={(event) => {
                  setWorks((current) =>
                    current.map((work) =>
                      work.id === selectedWorkId
                        ? { ...work, linkedCharacterWorkId: event.target.value || undefined }
                        : work,
                    ),
                  );
                }}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300"
              >
                <option value="">연결된 작품 없음</option>
                {characterWorks.map((work) => (
                  <option key={work.id} value={work.id}>
                    {work.titleKo ?? work.title}
                  </option>
                ))}
              </select>
              {linkedCharacterWork ? (
                <p className="mt-2 text-xs text-slate-600">
                  연결됨: {linkedCharacterWork.titleKo ?? linkedCharacterWork.title}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">현재 제목과 비슷한 인물관계도 작품을 자동으로 연결합니다.</p>
              )}
            </div>

            <button
              type="button"
              onClick={deleteSelectedWork}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            >
              <FontAwesomeIcon icon={faTrash} />
              작품 삭제
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-300/80 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">주요 사건 추가</p>
              <h2 className="text-xl font-semibold text-slate-900">새 사건 카드</h2>
            </div>
          </div>

          <form className="mt-5 space-y-3" onSubmit={addEvent}>
            <input
              value={eventDraft.title}
              onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="사건 제목"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            />
            <input
              value={eventDraft.yearLabel}
              onChange={(event) => setEventDraft((current) => ({ ...current, yearLabel: event.target.value }))}
              placeholder="예: 1776 또는 BC 3000"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            />
            <input
              value={eventDraft.chapter}
              onChange={(event) => setEventDraft((current) => ({ ...current, chapter: event.target.value }))}
              placeholder="장면 or 챕터"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            />
            <textarea
              value={eventDraft.summary}
              onChange={(event) => setEventDraft((current) => ({ ...current, summary: event.target.value }))}
              placeholder="사건 설명"
              className="h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            />
            <input
              value={eventDraft.tags}
              onChange={(event) => setEventDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="태그를 쉼표로 구분"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              <FontAwesomeIcon icon={faPlus} />
              사건 카드 추가
            </button>
          </form>
        </section>
      </aside>

      <section className="rounded-[32px] border border-slate-300/80 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Story Timeline</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              {selectedWork?.titleKo ?? selectedWork?.title ?? "소설 사건 타임라인"}
            </h2>
          </div>
          <button
            type="button"
            onClick={saveToGithub}
            className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            <FontAwesomeIcon icon={faCloudArrowUp} className="mr-2" />
            GitHub 저장
          </button>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_#fffdf7_0%,_#fbfbf8_100%)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>타임라인 보드</span>
              <span>{selectedWork?.events.length ?? 0}개 사건</span>
            </div>

            <div
              ref={boardRef}
              className="relative overflow-hidden rounded-[26px] border border-amber-200 bg-white shadow-inner"
              style={{ width: "100%", height: 560 }}
            >
              <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,_rgba(251,191,36,0.12),_rgba(255,255,255,0))]" />
              <div className="absolute inset-x-10 bottom-8 h-px bg-slate-200" />

              {Array.from({ length: 6 }).map((_, index) => {
                const ratio = index / 5;
                const year = Math.round(yearBounds.min + (yearBounds.max - yearBounds.min) * ratio);
                const x = getYearPosition(year, yearBounds.min, yearBounds.max);
                return (
                  <div key={year} className="absolute top-0 bottom-0" style={{ left: x }}>
                    <div className="absolute top-0 h-full w-px bg-slate-200" />
                    <span className="absolute top-4 -translate-x-1/2 text-[10px] font-semibold text-slate-500">
                      {year}
                    </span>
                  </div>
                );
              })}

              <svg className="pointer-events-none absolute inset-0" viewBox={`0 0 ${boardWidth} ${boardHeight}`}>
                {eventConnections.map((connection) => (
                  <path
                    key={`${connection.fromId}-${connection.toId}`}
                    d={`M ${connection.fromX} ${connection.fromY} C ${connection.fromX + 80} ${connection.fromY}, ${connection.toX - 80} ${connection.toY}, ${connection.toX} ${connection.toY}`}
                    stroke="rgba(148, 163, 184, 0.9)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="8 8"
                  />
                ))}
              </svg>

              {chapterGroups.map(({ chapter, events }) => (
                <div
                  key={chapter}
                  className="absolute left-4 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700"
                  style={{ top: 18 + chapterGroups.findIndex((group) => group.chapter === chapter) * 30 }}
                >
                  {chapter}
                </div>
              ))}

              {selectedWork?.events.map((event) => {
                const isActive = event.id === selectedEvent?.id;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onPointerDown={(pointerEvent) => beginDrag(pointerEvent, event.id)}
                    onClick={() => setSelectedEventId(event.id)}
                    className="absolute w-[220px] rounded-[24px] border bg-white p-3 text-left shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5"
                    style={{
                      left: event.x,
                      top: event.y,
                      borderColor: isActive ? event.color : "rgba(226,232,240,1)",
                      boxShadow: isActive ? `0 18px 40px ${event.color}33` : "0 18px 40px rgba(15,23,42,0.08)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: event.color }}
                      >
                        {event.yearLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <FontAwesomeIcon icon={faGripVertical} />
                        drag
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{event.title}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{event.chapter}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{event.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {event.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">선택한 사건</p>
                <h3 className="text-xl font-semibold text-slate-900">{selectedEvent?.title ?? "사건 없음"}</h3>
              </div>
              <button
                type="button"
                onClick={deleteSelectedEvent}
                disabled={!selectedEvent}
                className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>

            {linkedCharacterWork ? (
              <a
                href={`/characters?workId=${encodeURIComponent(linkedCharacterWork.id)}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                <FontAwesomeIcon icon={faLink} />
                연결된 인물관계도 열기: {linkedCharacterWork.titleKo ?? linkedCharacterWork.title}
              </a>
            ) : null}

            {selectedEvent ? (
              <div className="mt-4 space-y-3">
                <input
                  value={selectedEvent.title}
                  onChange={(event) => updateSelectedEvent("title", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                />
                <input
                  value={selectedEvent.yearLabel}
                  onChange={(event) => updateSelectedEvent("yearLabel", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                />
                <input
                  value={selectedEvent.chapter ?? ""}
                  onChange={(event) => updateSelectedEvent("chapter", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                />
                <textarea
                  value={selectedEvent.summary}
                  onChange={(event) => updateSelectedEvent("summary", event.target.value)}
                  className="h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                />
                <input
                  value={selectedEvent.tags.join(", ")}
                  onChange={(event) =>
                    updateSelectedEvent("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">사건을 선택해 상세 내용을 수정하세요.</p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${saveState === "error" ? "text-rose-500" : "text-slate-500"}`}>
            {saveMessage}
          </p>
        </div>
      </section>
    </div>
  );
}
