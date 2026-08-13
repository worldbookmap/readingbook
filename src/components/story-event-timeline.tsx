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
const cardWidth = 260;
const cardHeight = 180;
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
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});
  const [isCompact, setIsCompact] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [boardViewport, setBoardViewport] = useState({ width: boardWidth, height: boardHeight });
  const [activeModal, setActiveModal] = useState<"work" | "event" | "edit" | "detail" | null>(null);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [boardPan, setBoardPan] = useState({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{
    id: string;
    startPointerX: number;
    startPointerY: number;
    startCardX: number;
    startCardY: number;
  } | null>(null);
  const boardPanRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const characterWorks = (characterMapLibrary as { works?: Array<{ id: string; title: string; titleKo?: string }> }).works ?? [];

  const selectedWork = works.find((work) => work.id === selectedWorkId) ?? works[0] ?? null;
  const selectedEvent = selectedWork?.events.find((event) => event.id === selectedEventId) ?? selectedWork?.events[0] ?? null;
  const detailEvent = selectedWork?.events.find((event) => event.id === detailEventId) ?? null;

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

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const compact = width < 768;
      setIsCompact(compact);
      setBoardViewport({
        width: compact ? Math.max(320, Math.min(width - 32, 420)) : boardWidth,
        height: compact ? 720 : boardHeight,
      });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);

    return () => window.removeEventListener("resize", updateLayout);
  }, []);

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

  function beginDrag(event: React.PointerEvent<HTMLDivElement>, cardId: string) {
    if (!selectedWork) {
      return;
    }

    const card = selectedWork.events.find((item) => item.id === cardId);
    const board = boardRef.current;
    if (!card || !board) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = board.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left - boardPan.x) / timelineZoom;
    const pointerY = (event.clientY - rect.top - boardPan.y) / timelineZoom;

    dragRef.current = {
      id: cardId,
      startPointerX: pointerX,
      startPointerY: pointerY,
      startCardX: card.x,
      startCardY: card.y,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      openDetailModal(cardId);
    }, 500);

    setSelectedEventId(cardId);

    const handleMove = (moveEvent: PointerEvent) => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (!dragRef.current || dragRef.current.id !== cardId) {
        return;
      }

      const localX = (moveEvent.clientX - rect.left - boardPan.x) / timelineZoom;
      const localY = (moveEvent.clientY - rect.top - boardPan.y) / timelineZoom;
      const nextX = clamp(
        dragRef.current.startCardX + (localX - dragRef.current.startPointerX),
        0,
        Math.max(0, (boardRef.current?.clientWidth ?? boardViewport.width) - (isCompact ? 200 : cardWidth)),
      );
      const nextY = clamp(
        dragRef.current.startCardY + (localY - dragRef.current.startPointerY),
        0,
        Math.max(0, (boardRef.current?.clientHeight ?? boardViewport.height) - (isCompact ? 150 : cardHeight)),
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
      clearLongPressTimer();
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }

  function beginBoardDrag(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-card-root='true']")) {
      return;
    }

    boardPanRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: boardPan.x,
      originY: boardPan.y,
    };
    event.preventDefault();
    event.stopPropagation();

    const handleMove = (moveEvent: PointerEvent) => {
      if (!boardPanRef.current) {
        return;
      }

      setBoardPan({
        x: boardPanRef.current.originX + (moveEvent.clientX - boardPanRef.current.startX),
        y: boardPanRef.current.originY + (moveEvent.clientY - boardPanRef.current.startY),
      });
    };

    const handleUp = () => {
      boardPanRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }

  function toggleChapter(chapter: string) {
    setCollapsedChapters((current) => ({
      ...current,
      [chapter]: !current[chapter],
    }));
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
      const refreshed = await fetch("/api/story-events", { cache: "no-store" });
      const refreshedPayload = refreshed.ok
        ? ((await refreshed.json()) as {
            data: StoryTimelineLibrary;
            remoteEnabled: boolean;
            sha: string | null;
          })
        : null;

      const loadedWorks = refreshedPayload?.data.works ?? works;
      setWorks(loadedWorks);
      setSelectedWorkId((current) => {
        const nextSelected = loadedWorks.find((work) => work.id === current)?.id ?? loadedWorks[0]?.id ?? "";
        setSelectedEventId(loadedWorks.find((work) => work.id === nextSelected)?.events[0]?.id ?? null);
        return nextSelected;
      });
      setRemoteEnabled(refreshedPayload?.remoteEnabled ?? remoteEnabled);
      setRemoteSha(payload.sha);
      setSaveState("saved");
      setSaveMessage("저장 완료! 최신 데이터가 반영되었습니다.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "GitHub 저장에 실패했습니다.");
    }
  }

  function openDetailModal(eventId: string) {
    setSelectedEventId(eventId);
    setDetailEventId(eventId);
    setActiveModal("detail");
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleTimelineZoom(nextDelta: number) {
    setTimelineZoom((current) => {
      const nextValue = Number((current + nextDelta).toFixed(2));
      return clamp(nextValue, 0.7, 1.6);
    });
  }

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  const boardMetrics = {
    width: isCompact ? Math.max(320, Math.min(boardViewport.width, 420)) : boardWidth,
    height: isCompact ? 720 : boardHeight,
  };
  const boardScaleX = boardMetrics.width / boardWidth;
  const boardScaleY = boardMetrics.height / boardHeight;
  const mapTransform = `translate(${boardPan.x}px, ${boardPan.y}px) scale(${timelineZoom})`;

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Story Timeline
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {selectedWork?.titleKo ?? selectedWork?.title ?? "기본 사건 타임라인"}
            </h2>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex w-full flex-col gap-2 xl:w-[420px]">
              <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">작품 선택</label>
              <select
                value={selectedWorkId}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "__new__") {
                    setActiveModal("work");
                    return;
                  }

                  setSelectedWorkId(nextValue);
                }}
                className="w-full appearance-none rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] outline-none transition duration-200 hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
              >
                <option value="__new__">새 작품 추가</option>
                {works.map((work) => (
                  <option key={work.id} value={work.id}>
                    {work.titleKo ?? work.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-row flex-nowrap items-center justify-start gap-2 overflow-x-auto pb-1 xl:justify-end [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveModal("event")}
                className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 sm:px-3.5 sm:py-2 sm:text-sm"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1 sm:mr-2" />
                추가
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("edit")}
                disabled={!selectedEvent}
                className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5 sm:py-2 sm:text-sm"
              >
                <FontAwesomeIcon icon={faCalendarDays} className="mr-1 sm:mr-2" />
                수정
              </button>
              <button
                type="button"
                onClick={saveToGithub}
                className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 sm:px-3.5 sm:py-2 sm:text-sm"
              >
                <FontAwesomeIcon icon={faCloudArrowUp} className="mr-1 sm:mr-2" />
                저장
              </button>
              <button
                type="button"
                onClick={resetWorks}
                className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 sm:px-3 sm:py-2 sm:text-sm"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="mr-1 sm:mr-2" />
                초기화
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
              <FontAwesomeIcon icon={faBookOpen} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">작품 연결</p>
              <p className="text-sm font-semibold text-slate-800">
                {linkedCharacterWork ? `인물관계도 연결: ${linkedCharacterWork.titleKo ?? linkedCharacterWork.title}` : "인물관계도 연결 없음"}
              </p>
            </div>
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
            className="w-full appearance-none rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] outline-none transition duration-200 hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-100 xl:max-w-xs"
          >
            <option value="">연결된 작품 없음</option>
            {characterWorks.map((work) => (
              <option key={work.id} value={work.id}>
                {work.titleKo ?? work.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>타임라인 보드</span>
              <span>{selectedWork?.events.length ?? 0}개 사건</span>
            </div>

            <div className="mb-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleTimelineZoom(-0.05)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition hover:border-slate-300 active:scale-95"
                aria-label="타임라인 축소"
              >
                −
              </button>
              <span className="min-w-12 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {Math.round(timelineZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleTimelineZoom(0.05)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition hover:border-slate-300 active:scale-95"
                aria-label="타임라인 확대"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setTimelineZoom(1)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 active:scale-95"
              >
                원복
              </button>
            </div>

            <div
              ref={boardRef}
              onPointerDown={beginBoardDrag}
              onWheel={(event) => {
                event.preventDefault();
                handleTimelineZoom(event.deltaY < 0 ? 0.05 : -0.05);
              }}
              className="relative cursor-grab touch-none select-none overflow-hidden rounded-[26px] border border-amber-200 bg-white shadow-inner active:cursor-grabbing"
              style={{ width: "100%", height: boardMetrics.height, touchAction: "none" }}
            >
              <div
                className="absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: mapTransform, transformOrigin: "top left" }}
              >
                <div className="pointer-events-none absolute left-1/2 top-6 bottom-8 w-px -translate-x-1/2 bg-slate-200" />

                {Array.from({ length: 7 }).map((_, index) => {
                  const ratio = index / 6;
                  const year = Math.round(yearBounds.min + (yearBounds.max - yearBounds.min) * ratio);
                  const y = 70 + ratio * (boardMetrics.height - 120);
                  return (
                    <div key={`${year}-tick`} className="absolute left-0 right-0" style={{ top: y }}>
                      <div className="absolute left-0 h-px w-[calc(50%-10px)] bg-slate-200" />
                      <div className="absolute right-0 h-px w-[calc(50%-10px)] bg-slate-200" />
                      <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                        {year}
                      </span>
                    </div>
                  );
                })}

                {chapterGroups.map(({ chapter, events }, chapterIndex) => {
                  const collapsed = Boolean(collapsedChapters[chapter]);
                  const chapterTop = 16 + chapterIndex * 34;

                  return (
                    <div key={chapter} className="absolute inset-x-0">
                      <button
                        type="button"
                        onClick={() => toggleChapter(chapter)}
                        className="absolute left-4 z-10 inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-100/90 px-2.5 py-1 text-[9px] font-medium tracking-[0.12em] text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.04)] backdrop-blur-sm transition hover:border-slate-300 hover:text-slate-800 font-serif leading-none"
                        style={{ top: chapterTop }}
                      >
                        {chapter} · {collapsed ? "펼치기" : "접기"}
                      </button>

                      {!collapsed ? (
                        events.map((event) => {
                          const isActive = event.id === selectedEvent?.id;
                          const mobileCardWidth = isCompact ? 200 : cardWidth;
                          const mobileCardHeight = isCompact ? 150 : cardHeight;
                          const left = clamp(event.x, 0, Math.max(0, boardMetrics.width - mobileCardWidth));
                          const top = clamp(event.y, 0, Math.max(0, boardMetrics.height - mobileCardHeight));

                          return (
                            <div
                              key={event.id}
                              data-card-root="true"
                              onPointerDown={(pointerEvent) => beginDrag(pointerEvent, event.id)}
                              onDoubleClick={() => openDetailModal(event.id)}
                              onContextMenu={(pointerEvent) => {
                                pointerEvent.preventDefault();
                                openDetailModal(event.id);
                              }}
                              onClick={() => setSelectedEventId(event.id)}
                              className="absolute z-20 touch-none select-none rounded-[26px] border bg-white p-4 text-left shadow-[0_22px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-1"
                              style={{
                                width: mobileCardWidth,
                                left,
                                top,
                                borderColor: isActive ? event.color : "rgba(226,232,240,1)",
                                boxShadow: isActive ? `0 18px 40px ${event.color}33` : "0 18px 40px rgba(15,23,42,0.08)",
                                touchAction: "none",
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
                            </div>
                          );
                        })
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${saveState === "error" ? "text-rose-500" : "text-slate-500"}`}>
            {saveMessage}
          </p>
        </div>
      </section>

      {activeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/15 p-3 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-700">
                  {activeModal === "work" ? "📚" : activeModal === "event" ? "✨" : "📝"}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {activeModal === "work" ? "new work" : activeModal === "event" ? "new event" : "edit event"}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {activeModal === "work" ? "소설 추가" : activeModal === "event" ? "이벤트 카드 생성" : "선택한 사건 수정"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
              >
                닫기
              </button>
            </div>

            {activeModal === "work" ? (
              <form className="mt-5 space-y-3" onSubmit={(event) => { addWork(event); setActiveModal(null); }}>
                <input
                  value={workDraft.title}
                  onChange={(event) => setWorkDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="소설 제목"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <input
                  value={workDraft.author}
                  onChange={(event) => setWorkDraft((current) => ({ ...current, author: event.target.value }))}
                  placeholder="작가명(선택)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <select
                  value={workDraft.linkedCharacterWorkId}
                  onChange={(event) =>
                    setWorkDraft((current) => ({ ...current, linkedCharacterWorkId: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                >
                  <option value="">인물관계도와 연결하지 않음</option>
                  {characterWorks.map((work) => (
                    <option key={work.id} value={work.id}>
                      {work.titleKo ?? work.title}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">취소</button>
                  <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">추가하기</button>
                </div>
              </form>
            ) : null}

            {activeModal === "event" ? (
              <form className="mt-5 space-y-3" onSubmit={(event) => { addEvent(event); setActiveModal(null); }}>
                <input
                  value={eventDraft.title}
                  onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="사건 제목"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <input
                  value={eventDraft.yearLabel}
                  onChange={(event) => setEventDraft((current) => ({ ...current, yearLabel: event.target.value }))}
                  placeholder="예: 1776 또는 BC 3000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <input
                  value={eventDraft.chapter}
                  onChange={(event) => setEventDraft((current) => ({ ...current, chapter: event.target.value }))}
                  placeholder="장면 or 챕터"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <textarea
                  value={eventDraft.summary}
                  onChange={(event) => setEventDraft((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="사건 설명"
                  className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <input
                  value={eventDraft.tags}
                  onChange={(event) => setEventDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="태그를 쉼표로 구분"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">취소</button>
                  <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">추가하기</button>
                </div>
              </form>
            ) : null}

            {activeModal === "edit" && selectedEvent ? (
              <div className="mt-5 space-y-3">
                <input
                  value={selectedEvent.title}
                  onChange={(event) => updateSelectedEvent("title", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <input
                  value={selectedEvent.yearLabel}
                  onChange={(event) => updateSelectedEvent("yearLabel", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <input
                  value={selectedEvent.chapter ?? ""}
                  onChange={(event) => updateSelectedEvent("chapter", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <textarea
                  value={selectedEvent.summary}
                  onChange={(event) => updateSelectedEvent("summary", event.target.value)}
                  className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <input
                  value={selectedEvent.tags.join(", ")}
                  onChange={(event) =>
                    updateSelectedEvent("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">닫기</button>
                </div>
              </div>
            ) : null}

            {activeModal === "detail" && detailEvent ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full px-2 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: detailEvent.color }}>
                      {detailEvent.yearLabel}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{detailEvent.chapter}</span>
                  </div>
                  <h4 className="mt-3 text-xl font-semibold text-slate-900">{detailEvent.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{detailEvent.summary}</p>
                </div>

                <div className="space-y-2.5">
                  <input
                    value={detailEvent.title}
                    onChange={(event) => updateSelectedEvent("title", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                  />
                  <input
                    value={detailEvent.yearLabel}
                    onChange={(event) => updateSelectedEvent("yearLabel", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                  />
                  <input
                    value={detailEvent.chapter ?? ""}
                    onChange={(event) => updateSelectedEvent("chapter", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                  />
                  <textarea
                    value={detailEvent.summary}
                    onChange={(event) => updateSelectedEvent("summary", event.target.value)}
                    className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                  />
                  <input
                    value={detailEvent.tags.join(", ")}
                    onChange={(event) =>
                      updateSelectedEvent("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-300"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">태그 미리보기</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {detailEvent.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {linkedCharacterWork ? (
                  <a
                    href={`/characters?workId=${encodeURIComponent(linkedCharacterWork.id)}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    <FontAwesomeIcon icon={faLink} />
                    인물관계도 열기 · {linkedCharacterWork.titleKo ?? linkedCharacterWork.title}
                  </a>
                ) : null}

                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      deleteSelectedEvent();
                      setActiveModal(null);
                    }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      void saveToGithub();
                    }}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    저장
                  </button>
                  <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">닫기</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
