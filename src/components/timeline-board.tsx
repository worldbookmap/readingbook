"use client";

import { FormEvent, startTransition, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsLeftRight,
  faCalendarDays,
  faCloudArrowUp,
  faGripVertical,
  faTable,
  faGlobe,
  faPlus,
  faRotateLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { TimelineCard, TimelineRegion } from "@/lib/types";

const defaultRegions: TimelineRegion[] = ["서유럽", "동유럽", "아시아", "미국", "남미", "기타"];
const storageKey = "readingbook-timeline";
const eraOptions = ["전체", "고대", "중세", "근대", "현대"] as const;

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

  const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  if (left.year !== right.year) {
    return left.year - right.year;
  }

  return left.title.localeCompare(right.title, "ko");
}

function normalizeCards(cards: TimelineCard[], regionOrder: TimelineRegion[]) {
  return regionOrder.flatMap((region) => {
    const regionCards = cards
      .filter((card) => card.region === region)
      .sort((left, right) => {
        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        if (left.year !== right.year) {
          return left.year - right.year;
        }

        return left.title.localeCompare(right.title, "ko");
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

type DraftCard = {
  title: string;
  yearLabel: string;
  region: TimelineRegion;
  description: string;
  tags: string;
};

const defaultDraft: DraftCard = {
  title: "",
  yearLabel: "",
  region: defaultRegions[0],
  description: "",
  tags: "",
};

type Props = {
  initialCards: TimelineCard[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function TimelineBoard({ initialCards }: Props) {
  const initialRegionOrder = buildRegionOrder(initialCards);
  const normalizedInitialCards = normalizeCards(initialCards, initialRegionOrder);
  const [cards, setCards] = useState<TimelineCard[]>(normalizedInitialCards);
  const [regionNames, setRegionNames] = useState<TimelineRegion[]>(initialRegionOrder);
  const [activeId, setActiveId] = useState<string>(normalizedInitialCards[0]?.id ?? "");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCard>(defaultDraft);
  const [newRegionName, setNewRegionName] = useState("");
  const [summarySearch, setSummarySearch] = useState("");
  const [eraFilter, setEraFilter] = useState<(typeof eraOptions)[number]>("전체");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("브라우저 로컬 저장 사용 중");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteSha, setRemoteSha] = useState<string | null>(null);
  const didMountRef = useRef(false);

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
        startTransition(() => {
          setCards(parsed);
          setRegionNames(parsedRegionOrder);
          setActiveId(parsed[0]?.id ?? "");
          setRemoteEnabled(payload.remoteEnabled);
          setRemoteSha(payload.sha);
          setSaveMessage(
            payload.remoteEnabled
              ? "GitHub 저장소와 연결됨"
              : "환경변수 미설정: 브라우저 로컬 저장 사용 중",
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

  function createCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.yearLabel.trim()) {
      return;
    }

    setRegionNames((current) =>
      current.includes(draft.region) ? current : [...current, draft.region],
    );

    const nextCard: TimelineCard = {
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      yearLabel: draft.yearLabel.trim(),
      year: parseYear(draft.yearLabel),
      region: draft.region,
      description: draft.description.trim(),
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      order: cards.filter((card) => card.region === draft.region).length,
    };

    const nextRegionOrder = regionNames.includes(draft.region)
      ? regionNames
      : [...regionNames, draft.region];
    const nextCards = normalizeCards([...cards, nextCard], nextRegionOrder);
    setCards(nextCards);
    setActiveId(nextCard.id);
    setDraft(defaultDraft);
  }

  function moveCard(cardId: string, region: TimelineRegion, targetId?: string) {
    setCards((current) => reorderCards(current, cardId, region, regionNames, targetId));
  }

  function patchActiveCard(field: "yearLabel" | "title" | "description" | "tags", value: string) {
    if (!activeCard) {
      return;
    }

    setCards((current) =>
      current.map((card) => {
        if (card.id !== activeCard.id) {
          return card;
        }

        if (field === "tags") {
          return {
            ...card,
            tags: value
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          };
        }

        if (field === "yearLabel") {
          return { ...card, yearLabel: value, year: parseYear(value) };
        }

        return { ...card, [field]: value };
      }),
    );
  }

  function resetCards() {
    setCards(normalizedInitialCards);
    setRegionNames(initialRegionOrder);
    setActiveId(normalizedInitialCards[0]?.id ?? "");
    window.localStorage.removeItem(storageKey);
  }

  function deleteActiveCard() {
    if (!activeCard) {
      return;
    }

    const nextCards = normalizeCards(cards.filter((card) => card.id !== activeCard.id), regionNames);
    setCards(nextCards);
    setActiveId(nextCards[0]?.id ?? "");
  }

  function createRegion() {
    const trimmedRegion = newRegionName.trim();
    if (!trimmedRegion || regionNames.includes(trimmedRegion)) {
      return;
    }

    setRegionNames((current) => [...current, trimmedRegion]);
    setDraft((current) => ({ ...current, region: trimmedRegion }));
    setNewRegionName("");
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

  async function saveToGithub() {
    setSaveState("saving");
    setSaveMessage(remoteEnabled ? "GitHub 저장 중..." : "환경변수 확인 필요");

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

      setSaveState("saved");
      setRemoteSha(payload.sha);
      setSaveMessage("GitHub 저장소에 반영되었습니다.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "GitHub 저장에 실패했습니다.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <section className="rounded-[28px] border border-slate-300/80 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">역사 카드 추가</p>
              <h2 className="text-xl font-semibold text-slate-900">새 연표 항목</h2>
            </div>
          </div>

          <form className="mt-5 space-y-3" onSubmit={createCard}>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="사건 제목"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            />
            <input
              value={draft.yearLabel}
              onChange={(event) =>
                setDraft((current) => ({ ...current, yearLabel: event.target.value }))
              }
              placeholder="연도 예: BC 3000, 1776"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            />
            <select
              value={draft.region}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  region: event.target.value as TimelineRegion,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            >
              {regionNames.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <div className="space-y-2">
              <input
                value={newRegionName}
                onChange={(event) => setNewRegionName(event.target.value)}
                placeholder="새 카테고리 이름"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
              <button
                type="button"
                onClick={createRegion}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <FontAwesomeIcon icon={faPlus} />
                카테고리 추가
              </button>
            </div>
            <textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="설명"
              className="h-24 w-full rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
            <input
              value={draft.tags}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="태그를 쉼표로 구분"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-300"
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <FontAwesomeIcon icon={faPlus} />
              카드 추가
            </button>

            <button
              type="button"
              onClick={saveToGithub}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-50"
            >
              <FontAwesomeIcon icon={faCloudArrowUp} />
              GitHub에 저장
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

        <section className="rounded-[28px] border border-slate-300/80 bg-[linear-gradient(180deg,_#fafaf8_0%,_#f4f4ef_100%)] p-6 text-slate-700 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600">선택한 카드</p>
              <h3 className="text-xl font-semibold">{activeCard?.title}</h3>
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
            <input
              value={activeCard?.title ?? ""}
              onChange={(event) => patchActiveCard("title", event.target.value)}
              className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-emerald-300 focus:border-emerald-300"
            />
            <input
              value={activeCard?.yearLabel ?? ""}
              onChange={(event) => patchActiveCard("yearLabel", event.target.value)}
              className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-emerald-300 focus:border-emerald-300"
            />
            <textarea
              value={activeCard?.description ?? ""}
              onChange={(event) => patchActiveCard("description", event.target.value)}
              className="h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
            />
            <input
              value={activeCard?.tags.join(", ") ?? ""}
              onChange={(event) => patchActiveCard("tags", event.target.value)}
              className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-emerald-300 focus:border-emerald-300"
            />
            <button
              type="button"
              onClick={deleteActiveCard}
              disabled={!activeCard}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTrash} />
              삭제
            </button>
          </div>
        </section>
      </aside>

      <section className="rounded-[32px] border border-slate-300/80 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Timeline Board</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">역사 연표</h2>
          </div>
          <div className="hidden items-center gap-3 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 lg:flex">
            <FontAwesomeIcon icon={faArrowsLeftRight} className="text-slate-700" />
            카드를 드래그해서 다른 지역으로 이동하거나 순서를 바꾸세요.
          </div>
        </div>

        <div className="mt-4 lg:hidden">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">모바일 연표</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                {cards.length}개 카드
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              모바일에서는 지역별로 세로로 읽고, 카드를 눌러 아래 편집 패널에서 수정합니다.
            </p>

            <div className="mt-4 space-y-4">
              {regionNames.map((region) => {
                const regionCards = cards
                  .filter((card) => card.region === region)
                  .sort((left, right) => compareCards(left, right, regionNames));
                const accent = getRegionAccent(region);

                return (
                  <section key={region} className={`rounded-[24px] border bg-gradient-to-br ${accent} p-4`}>
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
                              onClick={() => setActiveId(card.id)}
                              className="block w-full rounded-[20px] border bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
                              style={{
                                borderColor: isActive ? "#38bdf8" : "rgba(226,232,240,1)",
                                boxShadow: isActive
                                  ? "0 14px 30px rgba(56,189,248,0.18)"
                                  : "0 8px 20px rgba(15,23,42,0.05)",
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                                  {card.yearLabel}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <FontAwesomeIcon icon={faGripVertical} />
                                  탭
                                </span>
                              </div>
                              <h4 className="mt-3 text-sm font-semibold text-slate-900">{card.title}</h4>
                              <p className="mt-2 text-xs leading-5 text-slate-600 line-clamp-3">
                                {card.description}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {card.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500"
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

        <div className="mt-6 hidden gap-4 lg:grid lg:grid-cols-2 2xl:grid-cols-3">
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
                className="rounded-[28px] border border-slate-300 bg-[linear-gradient(180deg,_#fcfcfb_0%,_#f6f6f2_100%)] p-4"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                    <FontAwesomeIcon icon={faGlobe} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{region}</h3>
                    <p className="text-sm text-slate-500">{regionCards.length}개의 카드</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {regionCards.map((card) => {
                    const isActive = card.id === activeCard?.id;

                    return (
                      <button
                        key={card.id}
                        type="button"
                        draggable
                        onDragStart={() => setDraggedId(card.id)}
                        onDragEnd={() => setDraggedId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggedId) {
                            moveCard(draggedId, region, card.id);
                            setDraggedId(null);
                          }
                        }}
                        onClick={() => setActiveId(card.id)}
                        className="block w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1"
                        style={{
                          borderColor: isActive ? "#111827" : "rgba(226,232,240,1)",
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
                        <h4 className="mt-3 text-base font-semibold text-slate-900">{card.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {card.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500"
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
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
                className="w-full max-w-56 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-sky-300 max-sm:max-w-none"
              />
              <select
                value={eraFilter}
                onChange={(event) => setEraFilter(event.target.value as (typeof eraOptions)[number])}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-sky-300"
              >
                {eraOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 hidden overflow-x-auto lg:block">
            <div className="min-w-[920px]">
                <div className="grid grid-cols-[140px_repeat(6,minmax(120px,1fr))] gap-px rounded-3xl bg-slate-200 p-px">
                <div className="bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">연도</div>
                {regionNames.map((region) => (
                  <div key={region} className="bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
                    {region}
                  </div>
                ))}

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
                                  onClick={() => setActiveId(card.id)}
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
                            className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                              <p className="text-xs text-slate-500">{card.region}</p>
                            </div>
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
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
  );
}