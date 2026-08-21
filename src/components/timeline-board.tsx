"use client";

import { FormEvent, startTransition, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsLeftRight,
  faCloudArrowUp,
  faFolderPlus,
  faGripVertical,
  faTable,
  faGlobe,
  faPlus,
  faRotateLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { TimelineCard, TimelineRegion } from "@/lib/types";
import { CustomSelect } from "@/components/custom-select";
import { FloatingSyncMenu } from "@/components/floating-sync-menu";
import { useNavigationGuard } from "@/components/navigation-guard";

const defaultRegions: TimelineRegion[] = ["서유럽", "동유럽", "아시아", "미국", "남미", "기타"];
const storageKey = "readingbook-timeline";
const eraOptions = ["전체", "고대", "중세", "근대", "현대"] as const;
const cardColors = ["#f59e0b", "#38bdf8", "#a78bfa", "#34d399", "#fb7185", "#f97316"];

function buildRegionOrder(cards: TimelineCard[]) {
  const regionSet = new Set<TimelineRegion>(defaultRegions);

  cards.forEach((card) => {
    regionSet.add(card.region);
  });

  return Array.from(regionSet);
}

function compareCards(left: TimelineCard, right: TimelineCard, regionOrder: TimelineRegion[]) {
  if (left.region !== right.region) {
    return regionOrder.indexOf(left.region) - regionOrder.indexOf(right.region);
  }

  if (left.year !== right.year) {
    return left.year - right.year;
  }

  const titleComparison = left.title.localeCompare(right.title, "ko");
  if (titleComparison !== 0) {
    return titleComparison;
  }

  return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
}

function normalizeCards(cards: TimelineCard[], regionOrder: TimelineRegion[]) {
  return regionOrder.flatMap((region) => {
    const regionCards = cards
      .filter((card) => card.region === region)
      .sort((left, right) => {
        if (left.year !== right.year) {
          return left.year - right.year;
        }

        const titleComparison = left.title.localeCompare(right.title, "ko");
        if (titleComparison !== 0) {
          return titleComparison;
        }

        return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
      });

    return regionCards.map((card, index) => ({ ...card, order: index }));
  });
}

function reorderCards(
  cards: TimelineCard[],
  draggedId: string,
  targetRegion: TimelineRegion,
  regionOrder: TimelineRegion[],
  targetId?: string,
) {
  const draggedCard = cards.find((card) => card.id === draggedId);
  if (!draggedCard) {
    return cards;
  }

  const remainingCards = cards.filter((card) => card.id !== draggedId);
  const targetCards = remainingCards
    .filter((card) => card.region === targetRegion)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  const insertIndex = targetId
    ? targetCards.findIndex((card) => card.id === targetId)
    : targetCards.length;
  const nextTargetCards = [...targetCards];
  nextTargetCards.splice(insertIndex < 0 ? targetCards.length : insertIndex, 0, {
    ...draggedCard,
    region: targetRegion,
  });

  const otherCards = remainingCards.filter((card) => card.region !== targetRegion);
  return normalizeCards([...otherCards, ...nextTargetCards], regionOrder);
}

function reorderRegions(
  regions: TimelineRegion[],
  draggedRegion: TimelineRegion,
  targetRegion: TimelineRegion,
) {
  if (draggedRegion === targetRegion) {
    return regions;
  }

  const nextRegions = regions.filter((region) => region !== draggedRegion);
  const targetIndex = nextRegions.indexOf(targetRegion);
  nextRegions.splice(targetIndex, 0, draggedRegion);
  return nextRegions;
}

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.03)] outline-none transition-all duration-200 placeholder:text-slate-400 selection:bg-slate-200 selection:text-slate-900 hover:border-slate-300 focus:border-slate-700 focus:ring-4 focus:ring-slate-200/80 invalid:border-rose-300 invalid:text-rose-700 invalid:focus:ring-rose-100";
const textareaClassName = `${inputClassName} h-28`;
const secondaryButtonClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200/80";
type DraftCard = {
  title: string;
  yearLabel: string;
  region: TimelineRegion;
  description: string;
  tags: string;
  color: string;
  size: string;
};

const defaultDraft: DraftCard = {
  title: "",
  yearLabel: "",
  region: defaultRegions[0],
  description: "",
  tags: "",
  color: cardColors[0],
  size: "350",
};
function clearDefaultValueIfNeeded(
  currentValue: string,
  defaultValues: string[],
  onClear: (nextValue: string) => void,
  event?: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
  const shouldReset = defaultValues.includes(currentValue);

  if (shouldReset) {
    onClear("");
  }

  if (event) {
    requestAnimationFrame(() => {
      event.currentTarget.select();
    });
  }
}

type Props = {
  initialCards: TimelineCard[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function TimelineBoard({ initialCards }: Props) {
  const initialRegionOrder = buildRegionOrder(initialCards);
  const normalizedInitialCards = normalizeCards(initialCards, initialRegionOrder);
  const [cards, setCards] = useState<TimelineCard[]>(normalizedInitialCards);
  const [regionNames, setRegionNames] = useState<TimelineRegion[]>(initialRegionOrder);
  const [draggedRegion, setDraggedRegion] = useState<TimelineRegion | null>(null);
  const [activeId, setActiveId] = useState<string>(normalizedInitialCards[0]?.id ?? "");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [summarySearch, setSummarySearch] = useState("");
  const [eraFilter, setEraFilter] = useState<(typeof eraOptions)[number]>("전체");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("브라우저 로컬 저장 사용 중");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteSha, setRemoteSha] = useState<string | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<{ card: TimelineCard; x: number; y: number } | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [modalDraft, setModalDraft] = useState<{
    id: string;
    title: string;
    yearLabel: string;
    description: string;
    tags: string;
    region: TimelineRegion;
    color: string;
    size: string;
  } | null>(null);
  const [draft, setDraft] = useState<DraftCard>(defaultDraft);
  const [newRegionName, setNewRegionName] = useState("");
  const didMountRef = useRef(false);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(normalizedInitialCards));

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      try {
        const response = await fetch("/api/timeline", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("failed to load timeline");
        }

        const payload = (await response.json()) as {
          data: { cards: TimelineCard[] };
          remoteEnabled: boolean;
          sha: string | null;
        };

        if (cancelled) {
          return;
        }

        const parsedRegionOrder = buildRegionOrder(payload.data.cards);
        const parsed = normalizeCards(payload.data.cards, parsedRegionOrder);
        setSavedSnapshot(JSON.stringify(parsed));
        startTransition(() => {
          setCards(parsed);
          setRegionNames(parsedRegionOrder);
          setActiveId(parsed[0]?.id ?? "");
          setRemoteEnabled(payload.remoteEnabled);
          setRemoteSha(payload.sha);
          setSaveMessage(
            payload.remoteEnabled
              ? "연결됨"
              : "브라우저 로컬 저장 모드",
          );
        });
      } catch {
        const saved = window.localStorage.getItem(storageKey);
        if (!saved || cancelled) {
          return;
        }

        const savedCards = JSON.parse(saved) as TimelineCard[];
        const parsedRegionOrder = buildRegionOrder(savedCards);
        const parsed = normalizeCards(savedCards, parsedRegionOrder);
        setSavedSnapshot(JSON.stringify(parsed));
        startTransition(() => {
          setCards(parsed);
          setRegionNames(parsedRegionOrder);
          setActiveId(parsed[0]?.id ?? "");
          setSaveMessage("API 연결 실패: 브라우저 로컬 저장 데이터 복원됨");
        });
      }
    }

    loadTimeline();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(cards));
  }, [cards]);

  const activeCard = cards.find((card) => card.id === activeId) ?? cards[0];

  function parseYear(yearLabel: string) {
    const cleaned = yearLabel.trim().toUpperCase();
    if (cleaned.startsWith("BC")) {
      const numeric = Number(cleaned.replace("BC", "").trim());
      return Number.isNaN(numeric) ? 0 : -numeric;
    }

    const numeric = Number(cleaned);
    return Number.isNaN(numeric) ? 0 : numeric;
  }

  function openNewCardModalForBlankSpace() {
    const nextId = crypto.randomUUID();
    const nextRegion = regionNames[0] ?? defaultRegions[0];

    const nextCard: TimelineCard = {
      id: nextId,
      region: nextRegion,
      year: 0,
      yearLabel: "새 연표",
      title: "새 카드",
      description: "설명을 입력해 주세요.",
      tags: [],
      color: cardColors[0],
      size: 350,
      order: cards.filter((card) => card.region === nextRegion).length,
    };

    setCards((current) => [...current, nextCard]);
    setActiveId(nextId);
    setModalDraft({
      id: nextId,
      title: "새 카드",
      yearLabel: "새 연표",
      description: "설명을 입력해 주세요.",
      tags: "",
      region: nextRegion,
      color: cardColors[0],
      size: "350",
    });
    setIsCreatingCard(true);
    setIsCardModalOpen(true);
  }

  function createCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function resetCards() {
    setCards(normalizedInitialCards);
    setRegionNames(initialRegionOrder);
    setActiveId(normalizedInitialCards[0]?.id ?? "");
    window.localStorage.removeItem(storageKey);
  }

  function createRegion() {
    const trimmedRegion = newRegionName.trim();
    if (!trimmedRegion || regionNames.includes(trimmedRegion)) {
      return;
    }

    setRegionNames((current) => [...current, trimmedRegion]);
    setDraft((current) => ({ ...current, region: trimmedRegion }));
    setNewRegionName("");
    setIsCategoryModalOpen(false);
  }

  function moveCard(cardId: string, region: TimelineRegion, targetId?: string) {
    setCards((current) => reorderCards(current, cardId, region, regionNames, targetId));
  }

  function moveRegion(targetRegion: TimelineRegion) {
    if (!draggedRegion) {
      return;
    }

    setRegionNames((current) => reorderRegions(current, draggedRegion, targetRegion));
    setDraggedRegion(null);
  }

  function deleteActiveCard(targetId?: string) {
    const nextTargetId = targetId ?? activeCard?.id;
    if (!nextTargetId) {
      return;
    }

    const hasConfirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!hasConfirmed) return;

    const nextCards = normalizeCards(cards.filter((card) => card.id !== nextTargetId), regionNames);
    setCards(nextCards);
    setActiveId(nextCards[0]?.id ?? "");
    setIsCardModalOpen(false);
    setModalDraft(null);
    setIsCreatingCard(false);
    window.alert("삭제 완료되었습니다.");
  }

  function openCardModal(cardId: string) {
    const targetCard = cards.find((card) => card.id === cardId);
    if (!targetCard) {
      return;
    }

    setActiveId(cardId);
    setModalDraft({
      id: targetCard.id,
      title: targetCard.title,
      yearLabel: targetCard.yearLabel,
      description: targetCard.description,
      tags: targetCard.tags.join(", "),
      region: targetCard.region,
      color: targetCard.color ?? cardColors[0],
      size: String(targetCard.size ?? 350),
    });
    setIsCreatingCard(false);
    setIsCardModalOpen(true);
  }

  function showCardPreview(card: TimelineCard, event: React.MouseEvent<HTMLElement>) {
    setHoveredCard({
      card,
      x: Math.min(event.clientX + 16, window.innerWidth - 304),
      y: Math.min(event.clientY + 16, window.innerHeight - 220),
    });
  }

  function saveModalChanges() {
    if (!modalDraft) {
      return;
    }

    const nextYear = parseYear(modalDraft.yearLabel);
    setCards((current) =>
      current.map((card) =>
        card.id !== modalDraft.id
          ? card
          : {
              ...card,
              title: modalDraft.title.trim() || card.title,
              yearLabel: modalDraft.yearLabel.trim() || card.yearLabel,
              year: nextYear,
              description: modalDraft.description.trim(),
              region: modalDraft.region,
              tags: modalDraft.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
              color: modalDraft.color,
              size: Math.max(160, Math.min(420, Number(modalDraft.size) || 350)),
            },
      ),
    );
    setIsCardModalOpen(false);
    setModalDraft(null);
    setIsCreatingCard(false);
  }

  function matchesEra(card: TimelineCard) {
    if (eraFilter === "전체") {
      return true;
    }

    if (eraFilter === "고대") {
      return card.year <= 500;
    }

    if (eraFilter === "중세") {
      return card.year >= 501 && card.year <= 1500;
    }

    if (eraFilter === "근대") {
      return card.year >= 1501 && card.year <= 1900;
    }

    return card.year >= 1901;
  }

  function getRegionAccent(region: TimelineRegion) {
    switch (region) {
      case "서유럽":
        return "from-sky-100 to-cyan-50 text-sky-700 border-sky-200";
      case "동유럽":
        return "from-violet-100 to-fuchsia-50 text-violet-700 border-violet-200";
      case "아시아":
        return "from-amber-100 to-orange-50 text-amber-700 border-amber-200";
      case "미국":
        return "from-emerald-100 to-teal-50 text-emerald-700 border-emerald-200";
      case "남미":
        return "from-rose-100 to-pink-50 text-rose-700 border-rose-200";
      case "기타":
        return "from-slate-100 to-slate-50 text-slate-700 border-slate-200";
      default:
        return "from-lime-100 to-green-50 text-lime-700 border-lime-200";
    }
  }

  const normalizedSearch = summarySearch.trim().toLowerCase();
  const summaryCards = cards.filter((card) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      `${card.title} ${card.yearLabel}`.toLowerCase().includes(normalizedSearch);

    return matchesSearch && matchesEra(card);
  });

  const yearRows = Array.from(new Set(summaryCards.map((card) => `${card.year}|${card.yearLabel}`)))
    .map((value) => {
      const [year, yearLabel] = value.split("|");
      return { year: Number(year), yearLabel };
    })
    .sort((left, right) => left.year - right.year);

  async function refreshFromGithub() {
    setSaveMessage("GitHub 내용 불러오는 중...");

    try {
      const response = await fetch("/api/timeline", { cache: "no-store" });
      if (!response.ok) throw new Error("GitHub 내용을 불러오지 못했습니다.");

      const payload = (await response.json()) as {
        data: { cards: TimelineCard[] };
        remoteEnabled: boolean;
        sha: string | null;
      };
      const parsedRegionOrder = buildRegionOrder(payload.data.cards);
      const parsed = normalizeCards(payload.data.cards, parsedRegionOrder);
      setSavedSnapshot(JSON.stringify(parsed));
      setCards(parsed);
      setRegionNames(parsedRegionOrder);
      setActiveId(parsed[0]?.id ?? "");
      setRemoteEnabled(payload.remoteEnabled);
      setRemoteSha(payload.sha);
      setSaveMessage(payload.remoteEnabled ? "GitHub 내용이 갱신되었습니다." : "브라우저 로컬 저장 모드");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "GitHub 내용을 불러오지 못했습니다.");
    }
  }

  async function saveToGithub() {
    setSaveState("saving");
    setSaveMessage(remoteEnabled ? "저장 중..." : "브라우저 로컬 저장 중");

    try {
      const response = await fetch("/api/timeline", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cards, sha: remoteSha }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "GitHub save failed");
      }

      const payload = (await response.json()) as { ok: true; sha: string };
      const refreshed = await fetch("/api/timeline", { cache: "no-store" });
      const refreshedPayload = refreshed.ok
        ? ((await refreshed.json()) as {
            data: { cards: TimelineCard[] };
            remoteEnabled: boolean;
            sha: string | null;
          })
        : null;

      const nextCards = refreshedPayload ? normalizeCards(refreshedPayload.data.cards, buildRegionOrder(refreshedPayload.data.cards)) : cards;
      const nextRegionOrder = refreshedPayload ? buildRegionOrder(refreshedPayload.data.cards) : regionNames;
      setCards(nextCards);
      setRegionNames(nextRegionOrder);
      setActiveId((current) => nextCards.find((card) => card.id === current)?.id ?? nextCards[0]?.id ?? "");
      setRemoteEnabled(refreshedPayload?.remoteEnabled ?? remoteEnabled);
      setRemoteSha(payload.sha);
      setSaveState("saved");
      setSaveMessage("저장 완료! 최신 데이터가 반영되었습니다.");
      window.alert("저장 완료! GitHub에 반영되었습니다.");
      setSavedSnapshot(JSON.stringify(nextCards));
      return true;
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "GitHub 저장에 실패했습니다.");
      return false;
    }
  }

  useNavigationGuard({
    isDirty: JSON.stringify(cards) !== savedSnapshot,
    onSave: saveToGithub,
  });

  function closeCardModal() {
    if (isCreatingCard && modalDraft) {
      setCards((current) => normalizeCards(current.filter((card) => card.id !== modalDraft.id), regionNames));
    }

    setIsCardModalOpen(false);
    setModalDraft(null);
    setIsCreatingCard(false);
  }

  return (
    <>
      {hoveredCard ? (
        <div
          className="pointer-events-none fixed z-[60] w-72 rounded-2xl border border-[#1e3038]/15 bg-[#fffdf9]/95 p-3 shadow-[0_18px_40px_rgba(30,48,56,0.2)] backdrop-blur-sm"
          style={{ left: hoveredCard.x, top: hoveredCard.y }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#1e3038] px-2 py-0.5 text-[10px] font-semibold text-white">{hoveredCard.card.yearLabel}</span>
            <span className="text-[10px] font-semibold text-[#a85f35]">{hoveredCard.card.region}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">{hoveredCard.card.title}</p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{hoveredCard.card.description || "설명이 아직 없습니다."}</p>
          {hoveredCard.card.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {hoveredCard.card.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">#{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {isCategoryModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-[#1e3038]/15 bg-[#fffdf9] p-5 shadow-[0_28px_80px_rgba(30,48,56,0.22)]">
            <h3 className="text-xl font-semibold text-slate-900">카테고리 추가</h3>
            <input
              value={newRegionName}
              onChange={(event) => setNewRegionName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  createRegion();
                }
              }}
              placeholder="예: 중동"
              autoFocus
              className={`${inputClassName} mt-4`}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewRegionName("");
                  setIsCategoryModalOpen(false);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={createRegion}
                disabled={!newRegionName.trim() || regionNames.includes(newRegionName.trim())}
                className="rounded-2xl bg-[#1e3038] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2b4650] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCardModalOpen && modalDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-[#1e3038]/15 bg-[#fffdf9] p-5 shadow-[0_28px_80px_rgba(30,48,56,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{isCreatingCard ? "카드 추가" : "카드 수정"}</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{modalDraft.title || "새 카드"}</h3>
              </div>
              <button
                type="button"
                onClick={closeCardModal}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">제목</label>
                <input
                  value={modalDraft.title}
                  onFocus={(event) => {
                    clearDefaultValueIfNeeded(
                      modalDraft.title,
                      ["새 카드"],
                      (nextValue) => {
                        setModalDraft((current) => (current ? { ...current, title: nextValue } : current));
                      },
                      event,
                    );
                  }}
                  onChange={(event) => setModalDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                  className={inputClassName}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">연도</label>
                  <input
                    value={modalDraft.yearLabel}
                    onFocus={(event) => {
                      clearDefaultValueIfNeeded(
                        modalDraft.yearLabel,
                        ["새 연표"],
                        (nextValue) => {
                          setModalDraft((current) => (current ? { ...current, yearLabel: nextValue } : current));
                        },
                        event,
                      );
                    }}
                    onChange={(event) => setModalDraft((current) => (current ? { ...current, yearLabel: event.target.value } : current))}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">지역</label>
                  <CustomSelect
                    value={modalDraft.region}
                    onChange={(nextValue) =>
                      setModalDraft((current) =>
                        current ? { ...current, region: nextValue as TimelineRegion } : current,
                      )
                    }
                    className="w-full"
                    options={regionNames.map((region) => ({ value: region, label: region }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">설명</label>
                <textarea
                  value={modalDraft.description}
                  onFocus={(event) => {
                    clearDefaultValueIfNeeded(
                      modalDraft.description,
                      ["설명을 입력해 주세요.", "새 카드 설명"],
                      (nextValue) => {
                        setModalDraft((current) => (current ? { ...current, description: nextValue } : current));
                      },
                      event,
                    );
                  }}
                  onChange={(event) => setModalDraft((current) => (current ? { ...current, description: event.target.value } : current))}
                  className={textareaClassName}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">태그</label>
                <input
                  value={modalDraft.tags}
                  onChange={(event) => setModalDraft((current) => (current ? { ...current, tags: event.target.value } : current))}
                  placeholder="태그를 쉼표로 구분"
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">카드 색상</label>
                <input
                  type="color"
                  value={modalDraft.color}
                  onChange={(event) => setModalDraft((current) => (current ? { ...current, color: event.target.value } : current))}
                  className="h-11 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-1"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span>카드 크기</span>
                  <span>{modalDraft.size}px</span>
                </label>
                <input
                  type="range"
                  min="160"
                  max="420"
                  step="10"
                  value={modalDraft.size}
                  onChange={(event) => setModalDraft((current) => (current ? { ...current, size: event.target.value } : current))}
                  className="mt-3 w-full accent-[#b86b3d]"
                  aria-label="카드 크기"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => deleteActiveCard(modalDraft.id)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              >
                <FontAwesomeIcon icon={faTrash} />
                삭제
              </button>
              <button
                type="button"
                onClick={saveModalChanges}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6">
      {false && <aside>
        <section className="rounded-[28px] border border-[#1e3038]/15 bg-[#fffdf9]/95 p-5 shadow-[0_18px_45px_rgba(45,43,37,0.1)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2dfd0] text-[#a85f35]">
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">역사 카드 추가</p>
              <h2 className="text-xl font-semibold text-slate-900">새 연표 항목</h2>
            </div>
          </div>

          <form className="mt-4 space-y-3" onSubmit={createCard}>
            <input
              value={draft.title}
              onFocus={(event) => {
                clearDefaultValueIfNeeded(
                  draft.title,
                  ["새 카드"],
                  (nextValue) => {
                    setDraft((current) => ({ ...current, title: nextValue }));
                  },
                  event,
                );
              }}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="사건 제목"
              className={inputClassName}
            />
            <input
              value={draft.yearLabel}
              onFocus={(event) => {
                clearDefaultValueIfNeeded(
                  draft.yearLabel,
                  ["새 연표", "연도 예: BC 3000, 1776"],
                  (nextValue) => {
                    setDraft((current) => ({ ...current, yearLabel: nextValue }));
                  },
                  event,
                );
              }}
              onChange={(event) =>
                setDraft((current) => ({ ...current, yearLabel: event.target.value }))
              }
              placeholder="연도 예: BC 3000, 1776"
              className={inputClassName}
            />
            <CustomSelect
              value={draft.region}
              onChange={(nextValue) =>
                setDraft((current) => ({
                  ...current,
                  region: nextValue as TimelineRegion,
                }))
              }
              className="w-full"
              options={regionNames.map((region) => ({ value: region, label: region }))}
            />
            <div className="space-y-2">
              <input
                value={newRegionName}
                onChange={(event) => setNewRegionName(event.target.value)}
                placeholder="새 카테고리 이름"
                className={inputClassName}
              />
              <button
                type="button"
                onClick={createRegion}
                className={secondaryButtonClassName}
              >
                <FontAwesomeIcon icon={faPlus} />
                카테고리 추가
              </button>
            </div>
            <textarea
              value={draft.description}
              onFocus={(event) => {
                clearDefaultValueIfNeeded(
                  draft.description,
                  ["설명을 입력해 주세요.", "설명"],
                  (nextValue) => {
                    setDraft((current) => ({ ...current, description: nextValue }));
                  },
                  event,
                );
              }}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="설명"
              className={textareaClassName}
            />
            <input
              value={draft.tags}
              onFocus={(event) => {
                clearDefaultValueIfNeeded(
                  draft.tags,
                  ["태그를 쉼표로 구분"],
                  (nextValue) => {
                    setDraft((current) => ({ ...current, tags: nextValue }));
                  },
                  event,
                );
              }}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="태그를 쉼표로 구분"
              className={inputClassName}
            />
            <input
              type="color"
              value={draft.color}
              onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
              className="h-11 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-1"
              aria-label="카드 색상"
            />
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span>카드 크기</span>
                <span>{draft.size}px</span>
              </label>
              <input
                type="range"
                min="160"
                max="420"
                step="10"
                value={draft.size}
                onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value }))}
                className="mt-3 w-full accent-[#b86b3d]"
                aria-label="카드 크기"
              />
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-700 active:scale-[0.99]"
            >
              <FontAwesomeIcon icon={faPlus} />
              카드 추가
            </button>

            <button
              type="button"
              onClick={saveToGithub}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
            >
              <FontAwesomeIcon icon={faCloudArrowUp} />
              저장
            </button>

            <p
              className={`text-xs leading-6 ${
                saveState === "error"
                  ? "text-rose-500"
                  : saveState === "saved"
                    ? "text-slate-600"
                    : "text-slate-500"
              }`}
            >
              {saveMessage}
            </p>
          </form>
        </section>

        <section className="rounded-[28px] border border-[#1e3038]/15 bg-[linear-gradient(180deg,_#f8f1e8_0%,_#eee6d9_100%)] p-5 text-slate-700 shadow-[0_18px_45px_rgba(45,43,37,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600">선택한 카드</p>
              <h3 className="text-xl font-semibold">{activeCard?.title ?? "카드를 선택해 주세요"}</h3>
            </div>
            <button
              type="button"
              onClick={resetCards}
              className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {activeCard ? (
                <div className="space-y-2">
                  <p>
                    <span className="font-semibold text-slate-900">연도:</span> {activeCard.yearLabel}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">지역:</span> {activeCard.region}
                  </p>
                  <p className="whitespace-pre-wrap line-clamp-3">{activeCard.description || "설명이 아직 없습니다."}</p>
                </div>
              ) : (
                <p className="text-slate-400">선택된 카드가 없습니다.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => activeCard && openCardModal(activeCard.id)}
              disabled={!activeCard}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTable} />
              수정하기
            </button>

            <button
              type="button"
              onClick={() => activeCard && deleteActiveCard(activeCard.id)}
              disabled={!activeCard}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTrash} />
              삭제
            </button>
          </div>
        </section>
      </aside>}

      <section className="relative rounded-[32px] border border-[#1e3038]/15 bg-[#fffdf9]/95 p-6 pb-24 shadow-[0_24px_60px_rgba(45,43,37,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#b86b3d]">Timeline Board</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#1e3038]">역사 연표</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-xl border border-[#1e3038]/10 bg-[#f4f0e8] px-4 py-2 text-sm text-slate-600 lg:flex">
              <FontAwesomeIcon icon={faArrowsLeftRight} className="text-[#b86b3d]" />
              카드를 드래그해서 다른 지역으로 이동하거나 순서를 바꾸세요.
            </div>
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#1e3038]/15 bg-white text-lg text-[#1e3038] shadow-[0_10px_24px_rgba(30,48,56,0.1)] transition hover:-translate-y-0.5 hover:border-[#b86b3d] hover:text-[#a85f35] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b86b3d]/30"
              aria-label="카테고리 추가"
              title="카테고리 추가"
            >
              <FontAwesomeIcon icon={faFolderPlus} />
            </button>
            <button
              type="button"
              onClick={openNewCardModalForBlankSpace}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e3038] text-lg text-white shadow-[0_10px_24px_rgba(30,48,56,0.18)] transition hover:-translate-y-0.5 hover:bg-[#2b4650] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b86b3d]/30"
              aria-label="새 역사 카드 추가"
              title="새 역사 카드 추가"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>

        <FloatingSyncMenu saveMessage={saveMessage} onRefresh={refreshFromGithub} onSave={saveToGithub} />

        <button
          type="button"
          onClick={openNewCardModalForBlankSpace}
          className="fixed bottom-6 left-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#b86b3d] text-xl text-white shadow-[0_14px_30px_rgba(184,107,61,0.3)] transition hover:-translate-y-1 hover:bg-[#9d5832] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b86b3d]/30"
          aria-label="새 역사 카드 추가"
          title="새 역사 카드 추가"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>

      <div className="mt-4 lg:hidden">
          <div className="rounded-[28px] border border-[#1e3038]/10 bg-[#f4f0e8] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">모바일 연표</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                {cards.length}개 카드
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              모바일에서는 지역별로 세로로 읽고, 카드를 눌러 선택하거나 더블클릭해 수정합니다.
            </p>

            <div className="mt-4 space-y-4">
              {regionNames.map((region) => {
                const regionCards = cards
                  .filter((card) => card.region === region)
                  .sort((left, right) => compareCards(left, right, regionNames));
                const accent = getRegionAccent(region);

                return (
                  <section
                    key={region}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedId) {
                        moveCard(draggedId, region);
                        setDraggedId(null);
                      }
                    }}
                    className={`rounded-[24px] border bg-gradient-to-br ${accent} p-4`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold">{region}</h3>
                        <p className="text-xs opacity-80">{regionCards.length}개의 카드</p>
                      </div>
                      <FontAwesomeIcon icon={faGlobe} className="text-sm opacity-70" />
                    </div>

                    <div className="mt-3 space-y-2">
                      {regionCards.length > 0 ? (
                        regionCards.map((card) => {
                          const isActive = card.id === activeCard?.id;

                          return (
                            <button
                              key={card.id}
                              type="button"
                              draggable
                              onDragStart={() => setDraggedId(card.id)}
                              onDragEnd={() => setDraggedId(null)}
                              onMouseEnter={(event) => showCardPreview(card, event)}
                              onMouseMove={(event) => showCardPreview(card, event)}
                              onMouseLeave={() => setHoveredCard(null)}
                              onClick={() => setActiveId(card.id)}
                              onDoubleClick={() => openCardModal(card.id)}
                              className="block w-full rounded-2xl border bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
                              style={{
                                width: `min(100%, ${card.size ?? 350}px)`,
                                borderColor: card.color ?? (isActive ? "#38bdf8" : "rgba(226,232,240,1)"),
                                boxShadow: isActive
                                  ? "0 14px 30px rgba(56,189,248,0.18)"
                                  : "0 8px 20px rgba(15,23,42,0.05)",
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: card.color ?? "#38bdf8" }}>
                                  {card.yearLabel}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <FontAwesomeIcon icon={faGripVertical} />
                                  탭
                                </span>
                              </div>
                              <h4 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{card.title}</h4>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {card.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="rounded-[20px] border border-dashed border-white/60 bg-white/60 px-4 py-5 text-sm text-slate-500">
                          이 지역에 카드가 없습니다.
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 hidden gap-3 lg:grid lg:grid-cols-3 2xl:grid-cols-4">
          {regionNames.map((region) => {
            const regionCards = cards
              .filter((card) => card.region === region)
              .sort((left, right) => compareCards(left, right, regionNames));

            return (
              <div
                key={region}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedId) {
                    moveCard(draggedId, region);
                    setDraggedId(null);
                  }
                }}
                className="rounded-[24px] border border-[#1e3038]/12 bg-[linear-gradient(180deg,_#fcfaf5_0%,_#f0e9de_100%)] p-3 shadow-[0_12px_28px_rgba(45,43,37,0.05)]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f2dfd0] text-[#a85f35]">
                    <FontAwesomeIcon icon={faGlobe} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{region}</h3>
                    <p className="text-xs text-slate-500">{regionCards.length}개의 카드</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {regionCards.map((card) => {
                    const isActive = card.id === activeCard?.id;

                    return (
                      <button
                        key={card.id}
                        type="button"
                        draggable
                        onDragStart={() => setDraggedId(card.id)}
                        onDragEnd={() => setDraggedId(null)}
                        onMouseEnter={(event) => showCardPreview(card, event)}
                        onMouseMove={(event) => showCardPreview(card, event)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggedId) {
                            moveCard(draggedId, region, card.id);
                            setDraggedId(null);
                          }
                        }}
                        onClick={() => setActiveId(card.id)}
                        onDoubleClick={() => openCardModal(card.id)}
                        className="block w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5"
                        style={{
                          width: `min(100%, ${card.size ?? 350}px)`,
                          borderColor: card.color ?? (isActive ? "#111827" : "rgba(226,232,240,1)"),
                          boxShadow: isActive
                            ? "0 16px 36px rgba(15,23,42,0.08)"
                            : "0 10px 30px rgba(15,23,42,0.04)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {card.yearLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <FontAwesomeIcon icon={faGripVertical} />
                            drag
                          </span>
                        </div>
                        <h4 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{card.title}</h4>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {card.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1e3038] text-[#f4e4d7]">
                <FontAwesomeIcon icon={faTable} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">한눈에 보는 역사 도표</p>
                <h3 className="text-lg font-semibold text-slate-900">연도 x 지역 요약 보기</h3>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <input
                value={summarySearch}
                onChange={(event) => setSummarySearch(event.target.value)}
                placeholder="제목 또는 연도 검색"
                className="w-full max-w-56 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.03)] outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-700 focus:ring-4 focus:ring-slate-200/80 max-sm:max-w-none"
              />
              <CustomSelect
                value={eraFilter}
                onChange={(nextValue) => setEraFilter(nextValue as (typeof eraOptions)[number])}
                className="min-w-[140px]"
                options={eraOptions.map((option) => ({ value: option, label: option }))}
              />
            </div>
          </div>

          <div className="mt-4 hidden overflow-x-auto lg:block">
            <div className="min-w-[920px]">
                <div
                  className="grid gap-px rounded-3xl bg-slate-200 p-px"
                  style={{
                    gridTemplateColumns: `140px repeat(${regionNames.length}, minmax(120px, 1fr))`,
                  }}
                >
                <div className="bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">연도</div>
                {regionNames.map((region) => {
                  const accent = getRegionAccent(region);

                  return (
                    <div
                      key={region}
                      draggable
                      onDragStart={() => setDraggedRegion(region)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        moveRegion(region);
                      }}
                      onDragEnd={() => setDraggedRegion(null)}
                      className={`cursor-grab border-b bg-gradient-to-br px-4 py-3 text-sm font-semibold transition active:cursor-grabbing ${accent}`}
                    >
                      {region}
                    </div>
                  );
                })}

                {yearRows.map((row) => (
                  <div key={`${row.year}-${row.yearLabel}`} className="contents">
                    <div
                      className="bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700"
                    >
                      {row.yearLabel}
                    </div>
                    {regionNames.map((region) => {
                      const matchingCards = summaryCards
                        .filter((card) => card.region === region && card.year === row.year)
                        .sort((left, right) => compareCards(left, right, regionNames));

                      return (
                        <div key={`${row.year}-${region}`} className="bg-white px-4 py-4 text-sm text-slate-600">
                          {matchingCards.length > 0 ? (
                            <div className="space-y-2">
                              {matchingCards.map((card) => (
                                <button
                                  key={card.id}
                                  type="button"
                                  onMouseEnter={(event) => showCardPreview(card, event)}
                                  onMouseMove={(event) => showCardPreview(card, event)}
                                  onMouseLeave={() => setHoveredCard(null)}
                                  onClick={() => setActiveId(card.id)}
                                  onDoubleClick={() => openCardModal(card.id)}
                                  className="block rounded-2xl bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  {card.title}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3 lg:hidden">
            {yearRows.length > 0 ? (
              yearRows.map((row) => {
                const rowCards = summaryCards.filter((card) => card.year === row.year);

                return (
                  <div key={`${row.year}-${row.yearLabel}`} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{row.yearLabel}</p>
                      <span className="text-xs text-slate-500">{rowCards.length}개</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {rowCards.length > 0 ? (
                        rowCards.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => setActiveId(card.id)}
                            onDoubleClick={() => openCardModal(card.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                              <p className="text-xs text-slate-500">{card.region}</p>
                            </div>
                            <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: card.color ?? "#38bdf8" }}>
                              {card.yearLabel}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                          해당 연도에 카드가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                현재 검색어나 시대 필터에 맞는 연표 항목이 없습니다.
              </div>
            )}
          </div>
          {yearRows.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
              현재 검색어나 시대 필터에 맞는 연표 항목이 없습니다.
            </div>
          ) : null}
        </div>
      </section>
    </div>
    </>
  );
}