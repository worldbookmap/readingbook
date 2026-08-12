"use client";

import { FormEvent, startTransition, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsUpDownLeftRight,
  faBookOpen,
  faCloudArrowUp,
  faCompress,
  faExpand,
  faLink,
  faLocationCrosshairs,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faPlus,
  faUserGroup,
  faWandSparkles,
} from "@fortawesome/free-solid-svg-icons";
import {
  CharacterMapLibrary,
  CharacterNode,
  CharacterRelationship,
  RelationshipType,
} from "@/lib/types";

const storageKey = "readingbook-character-map-library";
const relationOptions: RelationshipType[] = ["친구", "부부", "커플", "자식", "사업", "기타"];
const relationshipSelectionOptions: Array<RelationshipType | "선택 없음"> = ["선택 없음", ...relationOptions];
const boardWidth = 920;
const boardHeight = 920;
const nodeWidth = 160;
const nodeHeight = 140;
const iconNodeSize = 56;
const minZoom = 0.7;
const maxZoom = 1.5;
const minimapScale = 0.18;

type DraftState = {
  name: string;
  title: string;
  summary: string;
  majorActions: string;
  relationshipType: RelationshipType | "선택 없음";
  customRelationship: string;
  linkedToSelected: boolean;
};

const defaultDraft: DraftState = {
  name: "",
  title: "",
  summary: "",
  majorActions: "",
  relationshipType: "선택 없음",
  customRelationship: "",
  linkedToSelected: true,
};

type Props = {
  library: CharacterMapLibrary;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function CharacterMapClient({ library }: Props) {
  const [works, setWorks] = useState<CharacterMapLibrary["works"]>(library.works);
  const [selectedWorkId, setSelectedWorkId] = useState<string>(library.works[0]?.id ?? "");
  const [nodes, setNodes] = useState<CharacterNode[]>(library.works[0]?.seed.nodes ?? []);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>(library.works[0]?.seed.relationships ?? []);
  const [selectedId, setSelectedId] = useState<string>(library.works[0]?.seed.nodes[0]?.id ?? "");
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [zoom, setZoom] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("Vercel → GitHub 저장 준비 중");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState("");
  const [remoteSha, setRemoteSha] = useState<string | null>(null);
  const [activePanelTab, setActivePanelTab] = useState<"add" | "info">("add");
  const didMountRef = useRef(false);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);

  async function loadCharacterMap() {
    try {
      const response = await fetch("/api/character-map", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("failed to load character map");
      }

      const payload = (await response.json()) as {
        data: CharacterMapLibrary;
        remoteEnabled: boolean;
        sha: string | null;
      };

      startTransition(() => {
        const nextWorks = payload.data.works;
        setWorks(nextWorks);
        setSelectedWorkId((current) => {
          const nextWorkId = nextWorks.some((work) => work.id === current)
            ? current
            : nextWorks[0]?.id ?? "";
          const nextWork = nextWorks.find((work) => work.id === nextWorkId) ?? nextWorks[0] ?? null;
          setSelectedId(nextWork?.seed.nodes[0]?.id ?? "");
          setNodes(nextWork?.seed.nodes ?? []);
          setRelationships(nextWork?.seed.relationships ?? []);
          return nextWorkId;
        });
        setRemoteEnabled(payload.remoteEnabled);
        setRemoteSha(payload.sha);
        setSaveMessage(
          payload.remoteEnabled
            ? "GitHub 저장소와 연결됨"
            : "환경변수 미설정: 브라우저 로컬 저장 사용 중",
        );
      });
      return payload;
    } catch {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        return null;
      }

      const parsed = JSON.parse(saved) as CharacterMapLibrary;
      startTransition(() => {
        const nextWorks = parsed.works;
        setWorks(nextWorks);
        setSelectedWorkId(nextWorks[0]?.id ?? "");
        setSelectedId(nextWorks[0]?.seed.nodes[0]?.id ?? "");
        setNodes(nextWorks[0]?.seed.nodes ?? []);
        setRelationships(nextWorks[0]?.seed.relationships ?? []);
        setSaveMessage("API 연결 실패: 브라우저 로컬 저장 데이터 복원됨");
      });
      return { data: parsed, remoteEnabled: false, sha: null } as const;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const payload = await loadCharacterMap();
      if (cancelled || !payload) {
        return;
      }

      startTransition(() => {
        const nextWorks = payload.data.works;
        const selected = nextWorks.find((work) => work.id === selectedWorkId) ?? nextWorks[0] ?? null;
        setWorks(nextWorks);
        setSelectedWorkId(selected?.id ?? "");
        setSelectedId(selected?.seed.nodes[0]?.id ?? "");
        setNodes(selected?.seed.nodes ?? []);
        setRelationships(selected?.seed.relationships ?? []);
        setRemoteEnabled(payload.remoteEnabled);
        setRemoteSha(payload.sha ?? null);
      });
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify({ works }));
  }, [works]);

  useEffect(() => {
    if (!selectedWorkId) {
      return;
    }

    setWorks((current) =>
      current.map((work) =>
        work.id === selectedWorkId
          ? {
              ...work,
              seed: {
                nodes,
                relationships,
              },
            }
          : work,
      ),
    );
  }, [nodes, relationships, selectedWorkId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const selectedWork = works.find((work) => work.id === selectedWorkId) ?? null;
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0] ?? null;
  const recentWorks = works.slice(-3);
  const remainingWorks = works.filter((work) => !recentWorks.some((recent) => recent.id === work.id));
  const minimapWidth = boardWidth * minimapScale;
  const minimapHeight = boardHeight * minimapScale;
  const viewportWidth = Math.min(boardWidth, 920 / zoom);
  const viewportHeight = Math.min(boardHeight, 760 / zoom);
  const mobileBoardScale = 0.6;
  const mobileTotalScale = mobileBoardScale * zoom;

  const connectedRelationships = relationships.filter(
    (relationship) =>
      relationship.fromId === selectedNode?.id || relationship.toId === selectedNode?.id,
  );
  const selectedRelationship = relationships.find(
    (relationship) => relationship.id === selectedRelationshipId,
  ) ?? null;
  const selectedRelationshipPosition = selectedRelationship
    ? (() => {
        const from = nodes.find((node) => node.id === selectedRelationship.fromId);
        const to = nodes.find((node) => node.id === selectedRelationship.toId);

        if (!from || !to) {
          return null;
        }

        const curve = buildCurvePath(from, to);
        const cardWidth = 220;
        const cardHeight = 180;

        return {
          left: Math.min(boardWidth - cardWidth - 18, Math.max(18, curve.labelX - cardWidth / 2)),
          top: Math.min(boardHeight - cardHeight - 18, Math.max(18, curve.labelY - cardHeight / 2)),
        };
      })()
    : null;
  const coupleRelationships = relationships.filter(
    (relationship) => relationship.type === "부부" || relationship.type === "커플",
  );

  function handleCreateCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    const shouldLinkToSelected =
      draft.linkedToSelected && Boolean(selectedNode) && draft.relationshipType !== "선택 없음";
    const selectedRelationshipType =
      shouldLinkToSelected && draft.relationshipType !== "선택 없음" ? draft.relationshipType : null;
    const siblingCount = shouldLinkToSelected && selectedNode
      ? relationships.filter(
          (relationship) => relationship.fromId === selectedNode.id || relationship.toId === selectedNode.id,
        ).length
      : nodes.length;
    const angle = siblingCount * 0.85 + Math.PI / 4;
    const distance = 220;
    const baseX = shouldLinkToSelected && selectedNode ? selectedNode.x : boardWidth * 0.55;
    const baseY = shouldLinkToSelected && selectedNode ? selectedNode.y : boardHeight * 0.42;
    const nextNode: CharacterNode = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      title: draft.title.trim() || "새 인물",
      summary: draft.summary.trim() || "아직 메모가 없습니다.",
      majorActions: draft.majorActions
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      x: Math.min(
        boardWidth - nodeWidth - 40,
        Math.max(40, baseX + Math.round(Math.cos(angle) * distance)),
      ),
      y: Math.min(
        boardHeight - nodeHeight - 40,
        Math.max(40, baseY + Math.round(Math.sin(angle) * distance)),
      ),
      color: ["#f97316", "#0f766e", "#2563eb", "#7c3aed", "#dc2626"][siblingCount % 5],
    };

    const nextRelationship =
      selectedRelationshipType && selectedNode
        ? {
            id: crypto.randomUUID(),
            fromId: selectedNode.id,
            toId: nextNode.id,
            type: selectedRelationshipType,
            label:
              selectedRelationshipType === "기타"
                ? draft.customRelationship.trim() || "직접 입력 관계"
                : undefined,
          }
        : null;

    setNodes((current) => [...current, nextNode]);
    if (nextRelationship) {
      setRelationships((current) => [...current, nextRelationship]);
    }
    setSelectedId(nextNode.id);
    setDraft(defaultDraft);
  }

  function handleNodePatch(field: "name" | "title" | "summary" | "majorActions", value: string) {
    if (!selectedNode) {
      return;
    }

    setNodes((current) =>
      current.map((node) => {
        if (node.id !== selectedNode.id) {
          return node;
        }

        if (field === "majorActions") {
          return {
            ...node,
            majorActions: value
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
          };
        }

        return { ...node, [field]: value };
      }),
    );
  }

  function handleRelationshipSelect(relationshipId: string, nodeId?: string) {
    setSelectedRelationshipId(relationshipId);
    setActivePanelTab("info");
    if (nodeId) {
      setSelectedId(nodeId);
    }
  }

  function handleRelationshipPatch(field: "type" | "label", value: RelationshipType | string) {
    if (!selectedRelationship) {
      return;
    }

    setRelationships((current) =>
      current.map((relationship) =>
        relationship.id === selectedRelationship.id
          ? {
              ...relationship,
              [field]: value,
            }
          : relationship,
      ),
    );
  }

  function applyWorkSelection(workId: string, nextWorks: CharacterMapLibrary["works"]) {
    const nextWork = nextWorks.find((work) => work.id === workId) ?? nextWorks[0] ?? null;

    setSelectedWorkId(workId);
    if (!nextWork) {
      setNodes([]);
      setRelationships([]);
      setSelectedId("");
      setSelectedRelationshipId(null);
      setDraft(defaultDraft);
      return;
    }

    setNodes(nextWork.seed.nodes);
    setRelationships(nextWork.seed.relationships);
    setSelectedId(nextWork.seed.nodes[0]?.id ?? "");
    setSelectedRelationshipId(null);
    setDraft(defaultDraft);
  }

  function handleWorkSelect(workId: string) {
    const nextWorks = works;
    applyWorkSelection(workId, nextWorks);
  }

  function handleCreateWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newWorkTitle.trim();
    if (!title) {
      return;
    }

    const nextWork = {
      id: crypto.randomUUID(),
      title,
      titleKo: title,
      author: "새 작품",
      seed: { nodes: [], relationships: [] },
    };

    const nextWorks = [...works, nextWork];
    setWorks(nextWorks);
    applyWorkSelection(nextWork.id, nextWorks);
    setNewWorkTitle("");
  }

  function resetSeed() {
    const fallbackSeed = works.find((work) => work.id === selectedWorkId) ?? works[0];

    if (!fallbackSeed) {
      return;
    }

    setNodes(fallbackSeed.seed.nodes);
    setRelationships(fallbackSeed.seed.relationships);
    setSelectedId(fallbackSeed.seed.nodes[0]?.id ?? "");
    setSelectedRelationshipId(null);
    setDraft(defaultDraft);
    window.localStorage.removeItem(storageKey);
  }

  function updateNodePosition(nodeId: string, x: number, y: number) {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              x: Math.min(Math.max(20, x), boardWidth - nodeWidth - 20),
              y: Math.min(Math.max(20, y), boardHeight - nodeHeight - 20),
            }
          : node,
      ),
    );
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>, nodeId: string, displayScale = zoom) {
    const boardElement = event.currentTarget.closest("[data-character-board]") as HTMLDivElement | null;
    const boardBounds = boardElement?.getBoundingClientRect();
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!boardBounds) {
      return;
    }

    setSelectedId(nodeId);
    dragRef.current = {
      id: nodeId,
      offsetX: (event.clientX - bounds.left) / displayScale,
      offsetY: (event.clientY - bounds.top) / displayScale,
      moved: false,
    };

    event.preventDefault();

    const move = (moveEvent: PointerEvent) => {
      if (!dragRef.current || dragRef.current.id !== nodeId) {
        return;
      }

      dragRef.current.moved = true;
      updateNodePosition(
        nodeId,
        (moveEvent.clientX - boardBounds.left) / displayScale - dragRef.current.offsetX,
        (moveEvent.clientY - boardBounds.top) / displayScale - dragRef.current.offsetY,
      );
    };

    const end = () => {
      const dragState = dragRef.current;
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);

      if (dragState && !dragState.moved) {
        setSelectedId(nodeId);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  }

  function getNodeAnchor(node: CharacterNode) {
    return {
      x: node.x + iconNodeSize / 2,
      y: node.y + iconNodeSize / 2,
    };
  }

  function getCouplePair(nodeId: string) {
    const relationship = relationships.find(
      (item) =>
        (item.fromId === nodeId || item.toId === nodeId) &&
        (item.type === "부부" || item.type === "커플"),
    );

    if (!relationship) {
      return null;
    }

    const pairedId = relationship.fromId === nodeId ? relationship.toId : relationship.fromId;
    return { pairedId, relationId: relationship.id };
  }

  function buildCurvePath(from: CharacterNode, to: CharacterNode) {
    const start = getNodeAnchor(from);
    const end = getNodeAnchor(to);
    const startX = start.x;
    const startY = start.y;
    const endX = end.x;
    const endY = end.y;
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - Math.abs(endX - startX) * 0.18 - 28;

    return {
      path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
      labelX: startX * 0.25 + controlX * 0.5 + endX * 0.25,
      labelY: startY * 0.25 + controlY * 0.5 + endY * 0.25,
    };
  }

  function updateZoom(nextZoom: number) {
    setZoom(Math.min(maxZoom, Math.max(minZoom, Number(nextZoom.toFixed(2)))));
  }

  function handleWheelZoom(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    updateZoom(zoom + delta);
  }

  function toggleFullscreen() {
    if (!mapViewportRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    mapViewportRef.current.requestFullscreen();
  }

  function activateAddMode() {
    setActivePanelTab("add");
    setSelectedRelationshipId(null);
  }

  function activateInfoMode(nodeId?: string) {
    if (nodeId) {
      setSelectedId(nodeId);
    }
    setActivePanelTab("info");
  }

  function clearRelationshipSelection() {
    setSelectedRelationshipId(null);
  }

  function handleBoardBackgroundPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-character-node]") || target.closest("[data-character-relationship]") || target.closest("button")) {
      return;
    }

    clearRelationshipSelection();

    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
    }

    longPressTimeoutRef.current = window.setTimeout(() => {
      activateAddMode();
    }, 550);
  }

  function handleBoardBackgroundPointerUp() {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }

  async function saveToGithub() {
    setSaveState("saving");
    setSaveMessage(remoteEnabled ? "Vercel → GitHub 동기화 중..." : "환경변수 확인 필요");

    try {
      const nextLibrary: CharacterMapLibrary = { works };
      const response = await fetch("/api/character-map", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ library: nextLibrary, sha: remoteSha }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "GitHub save failed");
      }

      const payload = (await response.json()) as { ok: true; sha: string };
      const refreshed = await fetch("/api/character-map", { cache: "no-store" });
      const refreshedPayload = refreshed.ok ? ((await refreshed.json()) as {
        data: CharacterMapLibrary;
        remoteEnabled: boolean;
        sha: string | null;
      }) : null;

      const loadedWorks = refreshedPayload?.data.works ?? nextLibrary.works;
      window.localStorage.setItem(storageKey, JSON.stringify({ works: loadedWorks }));
      setWorks(loadedWorks);
      setSelectedWorkId((current) => {
        const nextSelected = loadedWorks.find((work) => work.id === current)?.id ?? loadedWorks[0]?.id ?? "";
        const nextWork = loadedWorks.find((work) => work.id === nextSelected) ?? loadedWorks[0] ?? null;
        setSelectedId(nextWork?.seed.nodes[0]?.id ?? "");
        setNodes(nextWork?.seed.nodes ?? []);
        setRelationships(nextWork?.seed.relationships ?? []);
        return nextSelected;
      });
      setRemoteEnabled(refreshedPayload?.remoteEnabled ?? remoteEnabled);
      setRemoteSha(payload.sha);
      setSaveState("saved");
      setSaveMessage("GitHub 저장소에 반영되었습니다. 최신 데이터를 다시 불러왔습니다.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "GitHub 저장에 실패했습니다.");
    }
  }

  return (
    <div ref={mapViewportRef} className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
      <section className="overflow-hidden rounded-[32px] border border-slate-300/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Character Map</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">인물 관계도</h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedWork?.titleKo ?? selectedWork?.title ?? "작품 없음"}
            </p>
          </div>
          <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
            <button
              type="button"
              onClick={() => updateZoom(zoom - 0.1)}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
              aria-label="축소"
            >
              <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
            </button>
            <span className="min-w-14 text-center text-sm font-medium text-slate-500">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => updateZoom(zoom + 0.1)}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
              aria-label="확대"
            >
              <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} className="mr-2" />
              {isFullscreen ? "전체화면 종료" : "전체화면"}
            </button>
            <button
              type="button"
              onClick={resetSeed}
              className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
            >
              시드로 되돌리기
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">작품 목록</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {recentWorks.map((work) => {
                  const isActive = work.id === selectedWorkId;
                  return (
                    <button
                      key={work.id}
                      type="button"
                      onClick={() => handleWorkSelect(work.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950"
                      }`}
                    >
                      {work.titleKo ?? work.title}
                    </button>
                  );
                })}

                {remainingWorks.length > 0 ? (
                  <select
                    aria-label="추가 작품 선택"
                    value={selectedWorkId}
                    onChange={(event) => handleWorkSelect(event.target.value)}
                    className="min-w-[170px] rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                  >
                    {remainingWorks.map((work) => (
                      <option key={work.id} value={work.id}>
                        {work.titleKo ?? work.title}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>

            <form onSubmit={handleCreateWork} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newWorkTitle}
                onChange={(event) => setNewWorkTitle(event.target.value)}
                placeholder="새 작품 이름"
                className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 sm:min-w-[220px]"
              />
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                작품 추가
              </button>
            </form>
          </div>
        </div>

        <div className="border-b border-slate-200/80 px-4 py-4 sm:px-6 lg:hidden">
          <div className="rounded-[24px] border border-slate-300 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8f8f6_100%)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">모바일 마인드맵</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => updateZoom(zoom - 0.1)}
                className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-950"
                aria-label="모바일 축소"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
              </button>
              <button
                type="button"
                onClick={() => updateZoom(zoom + 0.1)}
                className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-950"
                aria-label="모바일 확대"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
              </button>
              <button
                type="button"
                onClick={resetSeed}
                className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-950"
              >
                초기화
              </button>
            </div>

            <div className="mt-4 overflow-auto rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="relative h-[420px] min-w-[390px]">
                <div
                  className="relative"
                  data-character-board
                  style={{
                    height: boardHeight,
                    width: boardWidth,
                    transform: `scale(${mobileTotalScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                    {coupleRelationships.map((relationship) => {
                      const from = nodes.find((node) => node.id === relationship.fromId);
                      const to = nodes.find((node) => node.id === relationship.toId);

                      if (!from || !to) {
                        return null;
                      }

                      const fromAnchor = getNodeAnchor(from);
                      const toAnchor = getNodeAnchor(to);
                      const centerX = (fromAnchor.x + toAnchor.x) / 2;
                      const centerY = (fromAnchor.y + toAnchor.y) / 2;
                      const dx = toAnchor.x - fromAnchor.x;
                      const dy = toAnchor.y - fromAnchor.y;
                      const distance = Math.hypot(dx, dy) || 1;
                      const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;

                      return (
                        <ellipse
                          key={`couple-${relationship.id}`}
                          cx={centerX}
                          cy={centerY}
                          rx={Math.max(90, distance / 2 + 68)}
                          ry={68}
                          transform={`rotate(${rotation} ${centerX} ${centerY})`}
                          fill="rgba(244, 114, 182, 0.08)"
                          stroke="rgba(244, 114, 182, 0.38)"
                          strokeWidth="2"
                          strokeDasharray="8 7"
                        />
                      );
                    })}

                    {relationships.map((relationship) => {
                      const from = nodes.find((node) => node.id === relationship.fromId);
                      const to = nodes.find((node) => node.id === relationship.toId);

                      if (!from || !to) {
                        return null;
                      }

                      const curve = buildCurvePath(from, to);

                      return (
                        <g
                          key={`mobile-${relationship.id}`}
                          role="button"
                          tabIndex={0}
                          data-character-relationship
                          onClick={() => handleRelationshipSelect(relationship.id, relationship.fromId)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleRelationshipSelect(relationship.id, relationship.fromId);
                            }
                          }}
                          className="cursor-pointer"
                          style={{ pointerEvents: "auto" }}
                        >
                          <path
                            d={curve.path}
                            stroke={selectedRelationshipId === relationship.id ? "#111827" : "rgba(148,163,184,0.72)"}
                            strokeWidth={selectedRelationshipId === relationship.id ? 3.2 : 2.5}
                            fill="none"
                          />
                          <text
                            x={curve.labelX}
                            y={curve.labelY + 5}
                            textAnchor="middle"
                            fontSize="11"
                            fill={selectedRelationshipId === relationship.id ? "#111827" : "#475569"}
                          >
                            {relationship.label ?? relationship.type}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {selectedRelationship && selectedRelationshipPosition ? (
                    <div
                      className="absolute z-30 w-56 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_35px_rgba(15,23,42,0.12)] backdrop-blur"
                      style={{ left: selectedRelationshipPosition.left, top: selectedRelationshipPosition.top }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">관계 편집</p>
                        <button
                          type="button"
                          onClick={clearRelationshipSelection}
                          className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                        >
                          닫기
                        </button>
                      </div>

                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">종류</label>
                          <select
                            value={selectedRelationship.type}
                            onChange={(event) => handleRelationshipPatch("type", event.target.value as RelationshipType)}
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                          >
                            {relationOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">라벨</label>
                          <input
                            value={selectedRelationship.label ?? ""}
                            onChange={(event) => handleRelationshipPatch("label", event.target.value)}
                            placeholder={selectedRelationship.type === "기타" ? "직접 입력" : "선택 사항"}
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {nodes.map((node) => {
                    const isSelected = node.id === selectedNode?.id;
                    const isHovered = hoveredNodeId === node.id;
                    const showInfo = isSelected || isHovered;
                    const couplePair = getCouplePair(node.id);
                    const isPaired = Boolean(couplePair && couplePair.pairedId);

                    return (
                      <div key={`mobile-${node.id}`} className="absolute" style={{ left: node.x, top: node.y }}>
                        {isPaired ? (
                          <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rose-200/90 bg-rose-50/50" />
                        ) : null}
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onPointerDown={(event) => handlePointerDown(event, node.id, mobileTotalScale)}
                            onClick={() => {
                              setSelectedId(node.id);
                              setSelectedRelationshipId(null);
                            }}
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            onFocus={() => setHoveredNodeId(node.id)}
                            onBlur={() => setHoveredNodeId(null)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedId(node.id);
                              }
                            }}
                            className="flex h-14 w-14 cursor-grab items-center justify-center rounded-full border bg-white text-white shadow-lg transition active:cursor-grabbing touch-none"
                            style={{
                              borderColor: isSelected ? node.color : "rgba(226,232,240,0.92)",
                              boxShadow: isSelected
                                ? `0 20px 40px ${node.color}33`
                                : "0 18px 35px rgba(15,23,42,0.08)",
                              backgroundColor: node.color,
                            }}
                            aria-label={node.name}
                          >
                            <FontAwesomeIcon icon={faUserGroup} />
                          </button>
                          <p className="mt-2 max-w-[88px] truncate rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
                            {node.name}
                          </p>
                        </div>

                        {showInfo ? (
                          <div className="pointer-events-none absolute left-1/2 top-0 z-20 w-52 -translate-x-1/2 -translate-y-full rounded-[20px] border border-slate-200 bg-white/95 p-3 text-left shadow-[0_16px_36px_rgba(15,23,42,0.16)] backdrop-blur">
                            <p className="text-sm font-semibold text-slate-900">{node.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{node.title}</p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">{node.summary}</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                </div>
              </div>

              <p className="px-4 py-3 text-xs leading-5 text-slate-500">
                카드를 손가락으로 끌어서 옮길 수 있고, 빈 공간은 손가락으로 밀어 캔버스를 움직일 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div
            className="relative h-[760px] overflow-auto bg-[linear-gradient(180deg,_#fcfcfb_0%,_#f6f6f2_100%)]"
            onWheel={handleWheelZoom}
            onDoubleClick={() => activateAddMode()}
            onPointerDown={handleBoardBackgroundPointerDown}
            onPointerUp={handleBoardBackgroundPointerUp}
            onPointerLeave={handleBoardBackgroundPointerUp}
          >
            <div
              className="relative min-w-fit"
              style={{ height: boardHeight * zoom, width: boardWidth * zoom }}
            >
            <div
              className="relative"
              data-character-board
              style={{
                height: boardHeight,
                width: boardWidth,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
            <svg className="absolute inset-0 h-full w-full overflow-visible" style={{ pointerEvents: "auto" }}>
              {coupleRelationships.map((relationship) => {
                const from = nodes.find((node) => node.id === relationship.fromId);
                const to = nodes.find((node) => node.id === relationship.toId);

                if (!from || !to) {
                  return null;
                }

                const fromAnchor = getNodeAnchor(from);
                const toAnchor = getNodeAnchor(to);
                const centerX = (fromAnchor.x + toAnchor.x) / 2;
                const centerY = (fromAnchor.y + toAnchor.y) / 2;
                const dx = toAnchor.x - fromAnchor.x;
                const dy = toAnchor.y - fromAnchor.y;
                const distance = Math.hypot(dx, dy) || 1;
                const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;

                return (
                  <ellipse
                    key={`couple-${relationship.id}`}
                    cx={centerX}
                    cy={centerY}
                    rx={Math.max(92, distance / 2 + 70)}
                    ry={70}
                    transform={`rotate(${rotation} ${centerX} ${centerY})`}
                    fill="rgba(244, 114, 182, 0.08)"
                    stroke="rgba(244, 114, 182, 0.38)"
                    strokeWidth="2"
                    strokeDasharray="8 7"
                  />
                );
              })}

              {relationships.map((relationship) => {
                const from = nodes.find((node) => node.id === relationship.fromId);
                const to = nodes.find((node) => node.id === relationship.toId);

                if (!from || !to) {
                  return null;
                }

                const curve = buildCurvePath(from, to);

                return (
                  <g
                    key={relationship.id}
                    role="button"
                    tabIndex={0}
                    data-character-relationship
                    onClick={() => handleRelationshipSelect(relationship.id, relationship.fromId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleRelationshipSelect(relationship.id, relationship.fromId);
                      }
                    }}
                    className="cursor-pointer"
                    style={{ pointerEvents: "auto" }}
                  >
                    <path
                      d={curve.path}
                      stroke={selectedRelationshipId === relationship.id ? "#111827" : "rgba(148,163,184,0.8)"}
                      strokeWidth={selectedRelationshipId === relationship.id ? 3.2 : 2.5}
                      fill="none"
                    />
                    <rect
                      x={curve.labelX - 42}
                      y={curve.labelY - 12}
                      width="84"
                      height="24"
                      rx="12"
                      fill={selectedRelationshipId === relationship.id ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.88)"}
                    />
                    <text
                      x={curve.labelX}
                      y={curve.labelY + 5}
                      textAnchor="middle"
                      fontSize="11"
                      fill={selectedRelationshipId === relationship.id ? "#111827" : "#475569"}
                    >
                      {relationship.label ?? relationship.type}
                    </text>
                  </g>
                );
              })}
            </svg>

            {selectedRelationship && selectedRelationshipPosition ? (
              <div
                className="absolute z-30 w-56 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_35px_rgba(15,23,42,0.12)] backdrop-blur"
                style={{ left: selectedRelationshipPosition.left, top: selectedRelationshipPosition.top }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">관계 편집</p>
                  <button
                    type="button"
                    onClick={clearRelationshipSelection}
                    className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    닫기
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">종류</label>
                    <select
                      value={selectedRelationship.type}
                      onChange={(event) => handleRelationshipPatch("type", event.target.value as RelationshipType)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                    >
                      {relationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">라벨</label>
                    <input
                      value={selectedRelationship.label ?? ""}
                      onChange={(event) => handleRelationshipPatch("label", event.target.value)}
                      placeholder={selectedRelationship.type === "기타" ? "직접 입력" : "선택 사항"}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {nodes.map((node) => {
              const isSelected = node.id === selectedNode?.id;
              const isHovered = hoveredNodeId === node.id;
              const showInfo = isSelected || isHovered;
              const couplePair = getCouplePair(node.id);
              const isPaired = Boolean(couplePair && couplePair.pairedId);

              return (
                <div key={node.id} className="absolute" style={{ left: node.x, top: node.y }}>
                  {isPaired ? (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rose-200/90 bg-rose-50/50" />
                  ) : null}
                  <div className="flex flex-col items-center">
                    <div
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => handlePointerDown(event, node.id)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onFocus={() => setHoveredNodeId(node.id)}
                      onBlur={() => setHoveredNodeId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(node.id);
                          setSelectedRelationshipId(null);
                        }
                      }}
                      onClick={() => {
                        setSelectedId(node.id);
                        setSelectedRelationshipId(null);
                      }}
                      className="flex h-14 w-14 cursor-grab items-center justify-center rounded-full border text-white shadow-lg transition hover:-translate-y-1 active:cursor-grabbing"
                      style={{
                        borderColor: isSelected ? node.color : "rgba(226,232,240,0.9)",
                        boxShadow: isSelected
                          ? `0 20px 40px ${node.color}33`
                          : "0 18px 35px rgba(15,23,42,0.08)",
                        backgroundColor: node.color,
                      }}
                    >
                      <FontAwesomeIcon icon={faUserGroup} />
                    </div>
                    <p className="mt-2 max-w-[88px] truncate rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
                      {node.name}
                    </p>
                  </div>

                  {showInfo ? (
                    <div className="pointer-events-none absolute left-1/2 top-0 z-20 w-52 -translate-x-1/2 -translate-y-full rounded-[20px] border border-slate-200 bg-white/95 p-3 text-left shadow-[0_16px_36px_rgba(15,23,42,0.16)] backdrop-blur">
                      <p className="text-sm font-semibold text-slate-900">{node.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{node.title}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{node.summary}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
            </div>
            </div>

            <div className="pointer-events-none absolute bottom-4 right-4 rounded-[24px] border border-slate-300/80 bg-white/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <FontAwesomeIcon icon={faLocationCrosshairs} className="text-slate-700" />
                Minimap
              </div>
              <div
                className="relative overflow-hidden rounded-2xl bg-slate-950/95"
                style={{ height: minimapHeight, width: minimapWidth }}
              >
                <svg className="absolute inset-0 h-full w-full">
                  {relationships.map((relationship) => {
                    const from = nodes.find((node) => node.id === relationship.fromId);
                    const to = nodes.find((node) => node.id === relationship.toId);

                    if (!from || !to) {
                      return null;
                    }

                    return (
                      <line
                        key={relationship.id}
                        x1={(from.x + iconNodeSize / 2) * minimapScale}
                        y1={(from.y + iconNodeSize / 2) * minimapScale}
                        x2={(to.x + iconNodeSize / 2) * minimapScale}
                        y2={(to.y + iconNodeSize / 2) * minimapScale}
                        stroke="rgba(203,213,225,0.45)"
                        strokeWidth="1.2"
                      />
                    );
                  })}
                </svg>
                {nodes.map((node) => {
                  const isSelected = node.id === selectedNode?.id;

                  return (
                    <div
                      key={`${node.id}-minimap`}
                      className="absolute rounded-md border"
                      style={{
                        left: node.x * minimapScale,
                        top: node.y * minimapScale,
                        width: 18,
                        height: 14,
                        backgroundColor: node.color,
                        borderColor: isSelected ? "#fff" : "rgba(255,255,255,0.25)",
                        boxShadow: isSelected ? "0 0 0 2px rgba(255,255,255,0.25)" : "none",
                      }}
                    />
                  );
                })}
                <div
                  className="absolute rounded-xl border border-slate-300/80 bg-slate-100/70"
                  style={{
                    left: 0,
                    top: 0,
                    width: viewportWidth * minimapScale,
                    height: viewportHeight * minimapScale,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                마우스 휠로 확대/축소하고, 카드 drag로 배치를 조정합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[30px] border border-violet-200/70 bg-gradient-to-br from-white via-violet-50/40 to-amber-50/30 p-6 shadow-[0_22px_50px_rgba(124,58,237,0.08)]">
          <div className="mb-5 flex rounded-2xl border border-violet-200 bg-white/80 p-1 shadow-inner shadow-violet-100/80">
            <button
              type="button"
              onClick={() => setActivePanelTab("add")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activePanelTab === "add"
                  ? "bg-gradient-to-r from-slate-900 to-violet-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              인물 추가
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedNode) {
                  setActivePanelTab("info");
                }
              }}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activePanelTab === "info"
                  ? "bg-gradient-to-r from-slate-900 to-violet-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              인물 정보
            </button>
          </div>

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FontAwesomeIcon icon={faBookOpen} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{activePanelTab === "add" ? "새 인물" : "선택한 인물"}</p>
                <h3 className="text-xl font-semibold text-slate-900">{selectedNode?.name || (activePanelTab === "info" ? "인물 없음" : "새 인물")}</h3>
              </div>
            </div>

            <div className="relative mt-5">
              <div
                className={`transition-all duration-200 ${
                  activePanelTab === "info" ? "opacity-100 translate-y-0" : "pointer-events-none absolute inset-0 opacity-0 translate-y-2"
                }`}
              >
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      이름
                    </label>
                    <input
                      value={selectedNode?.name ?? ""}
                      onChange={(event) => handleNodePatch("name", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      역할 / 호칭
                    </label>
                    <input
                      value={selectedNode?.title ?? ""}
                      onChange={(event) => handleNodePatch("title", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      배경 메모
                    </label>
                    <textarea
                      value={selectedNode?.summary ?? ""}
                      onChange={(event) => handleNodePatch("summary", event.target.value)}
                      className="mt-2 h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      주요 행동 메모
                    </label>
                    <textarea
                      value={selectedNode?.majorActions.join("\n") ?? ""}
                      onChange={(event) => handleNodePatch("majorActions", event.target.value)}
                      className="mt-2 h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <FontAwesomeIcon icon={faLink} className="text-slate-700" />
                    연결된 관계
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {connectedRelationships.map((relationship) => (
                      <button
                        key={relationship.id}
                        type="button"
                        onClick={() => handleRelationshipSelect(relationship.id, selectedNode?.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium shadow-sm transition ${
                          selectedRelationship?.id === relationship.id
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        {relationship.label ?? relationship.type}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      관계 편집
                    </p>
                    {selectedRelationship ? (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600">관계 종류</label>
                          <select
                            value={selectedRelationship.type}
                            onChange={(event) => handleRelationshipPatch("type", event.target.value as RelationshipType)}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                          >
                            {relationOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-600">커스텀 라벨</label>
                          <input
                            value={selectedRelationship.label ?? ""}
                            onChange={(event) => handleRelationshipPatch("label", event.target.value)}
                            placeholder={selectedRelationship.type === "기타" ? "관계를 직접 입력" : "선택 사항"}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        카드 또는 관계선 클릭 후 여기에서 관계 종류와 라벨을 수정할 수 있습니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`transition-all duration-200 ${
                  activePanelTab === "add" ? "opacity-100 translate-y-0" : "pointer-events-none absolute inset-0 opacity-0 translate-y-2"
                }`}
              >
                <div className="rounded-[28px] border border-slate-300/80 bg-[linear-gradient(180deg,_#fafaf8_0%,_#f4f4ef_100%)] p-6 text-slate-800 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <FontAwesomeIcon icon={faPlus} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">인물 추가</p>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {draft.linkedToSelected && selectedNode ? `${selectedNode.name}와 이어 붙이기` : "독립 인물로 추가"}
                      </h3>
                    </div>
                  </div>

                  <form className="mt-5 space-y-3" onSubmit={handleCreateCharacter}>
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="인물 이름"
                      className="w-full rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-300"
                    />
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="역할 또는 호칭"
                      className="w-full rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-300"
                    />
                    <textarea
                      value={draft.summary}
                      onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                      placeholder="인물 소개"
                      className="h-24 w-full rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-300"
                    />
                    <textarea
                      value={draft.majorActions}
                      onChange={(event) => setDraft((current) => ({ ...current, majorActions: event.target.value }))}
                      placeholder="주요 행동을 줄바꿈으로 입력"
                      className="h-24 w-full rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-300"
                    />
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!draft.linkedToSelected}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            linkedToSelected: !event.target.checked,
                            relationshipType: event.target.checked ? "선택 없음" : current.relationshipType,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 bg-white text-slate-700"
                      />
                      현재 인물과 연결하지 않고 독립 인물로 추가
                    </label>
                    <select
                      disabled={draft.linkedToSelected === false}
                      value={draft.relationshipType}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          relationshipType: event.target.value as RelationshipType | "선택 없음",
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-slate-400"
                    >
                      {relationshipSelectionOptions.map((option) => (
                        <option key={option} value={option} className="text-slate-900">
                          {option}
                        </option>
                      ))}
                    </select>

                    {draft.linkedToSelected && draft.relationshipType === "기타" ? (
                      <input
                        value={draft.customRelationship}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, customRelationship: event.target.value }))
                        }
                        placeholder="직접 입력 관계"
                        className="w-full rounded-2xl border border-slate-300 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400"
                      />
                    ) : null}

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-violet-700 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      <FontAwesomeIcon icon={faWandSparkles} />
                      연결 인물 만들기
                    </button>

                    <button
                      type="button"
                      onClick={saveToGithub}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white/90 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      <FontAwesomeIcon icon={faCloudArrowUp} />
                      Vercel → GitHub 저장
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
                </div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}