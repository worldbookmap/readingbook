"use client";

import { FormEvent, startTransition, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsUpDownLeftRight,
  faBookOpen,
  faCloudArrowUp,
  faLink,
  faLocationCrosshairs,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faPlus,
  faUserGroup,
  faWandSparkles,
} from "@fortawesome/free-solid-svg-icons";
import {
  CharacterNode,
  CharacterRelationship,
  CharacterSeed,
  RelationshipType,
} from "@/lib/types";

const storageKey = "readingbook-character-map";
const relationOptions: RelationshipType[] = ["친구", "부부", "자식", "사업", "기타"];
const boardWidth = 920;
const boardHeight = 920;
const nodeWidth = 160;
const nodeHeight = 140;
const minZoom = 0.7;
const maxZoom = 1.5;
const minimapScale = 0.18;

type DraftState = {
  name: string;
  title: string;
  summary: string;
  majorActions: string;
  relationshipType: RelationshipType;
  customRelationship: string;
  linkedToSelected: boolean;
};

const defaultDraft: DraftState = {
  name: "",
  title: "",
  summary: "",
  majorActions: "",
  relationshipType: "친구",
  customRelationship: "",
  linkedToSelected: true,
};

type Props = {
  seed: CharacterSeed;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function CharacterMapClient({ seed }: Props) {
  const [nodes, setNodes] = useState<CharacterNode[]>(seed.nodes);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>(seed.relationships);
  const [selectedId, setSelectedId] = useState<string>(seed.nodes[0]?.id ?? "");
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [zoom, setZoom] = useState(1);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("브라우저 로컬 저장 사용 중");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteSha, setRemoteSha] = useState<string | null>(null);
  const didMountRef = useRef(false);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCharacterMap() {
      try {
        const response = await fetch("/api/character-map", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("failed to load character map");
        }

        const payload = (await response.json()) as {
          data: CharacterSeed;
          remoteEnabled: boolean;
          sha: string | null;
        };

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setNodes(payload.data.nodes);
          setRelationships(payload.data.relationships);
          setSelectedId(payload.data.nodes[0]?.id ?? "");
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

        const parsed = JSON.parse(saved) as CharacterSeed;
        startTransition(() => {
          setNodes(parsed.nodes);
          setRelationships(parsed.relationships);
          setSelectedId(parsed.nodes[0]?.id ?? "");
          setSaveMessage("API 연결 실패: 브라우저 로컬 저장 데이터 복원됨");
        });
      }
    }

    loadCharacterMap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify({ nodes, relationships }));
  }, [nodes, relationships]);

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0];
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

  function handleCreateCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    const shouldLinkToSelected = draft.linkedToSelected && Boolean(selectedNode);
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

    const nextRelationship = shouldLinkToSelected && selectedNode
      ? {
          id: crypto.randomUUID(),
          fromId: selectedNode.id,
          toId: nextNode.id,
          type: draft.relationshipType,
          label:
            draft.relationshipType === "기타"
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

  function handleNodePatch(field: "summary" | "majorActions", value: string) {
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

        return { ...node, summary: value };
      }),
    );
  }

  function resetSeed() {
    setNodes(seed.nodes);
    setRelationships(seed.relationships);
    setSelectedId(seed.nodes[0]?.id ?? "");
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

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, nodeId: string, displayScale = zoom) {
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

  function buildCurvePath(from: CharacterNode, to: CharacterNode) {
    const startX = from.x + 80;
    const startY = from.y + 52;
    const endX = to.x + 80;
    const endY = to.y + 52;
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

  async function saveToGithub() {
    setSaveState("saving");
    setSaveMessage(remoteEnabled ? "GitHub 저장 중..." : "환경변수 확인 필요");

    try {
      const response = await fetch("/api/character-map", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nodes, relationships, sha: remoteSha }),
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
      <section className="overflow-hidden rounded-[32px] border border-white/50 bg-white/75 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Character Map</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">인물 관계도</h2>
          </div>
          <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
            <button
              type="button"
              onClick={() => updateZoom(zoom - 0.1)}
              className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
              aria-label="축소"
            >
              <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
            </button>
            <span className="min-w-14 text-center text-sm font-medium text-slate-500">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => updateZoom(zoom + 0.1)}
              className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
              aria-label="확대"
            >
              <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
            </button>
            <button
              type="button"
              onClick={resetSeed}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
            >
              시드로 되돌리기
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200/70 px-4 py-4 sm:px-6 lg:hidden">
          <div className="rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_42%),linear-gradient(180deg,_#fff,_#f8fafc)] p-4">
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
                className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
                aria-label="모바일 축소"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
              </button>
              <button
                type="button"
                onClick={() => updateZoom(zoom + 0.1)}
                className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
                aria-label="모바일 확대"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
              </button>
              <button
                type="button"
                onClick={resetSeed}
                className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
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
                    {relationships.map((relationship) => {
                      const from = nodes.find((node) => node.id === relationship.fromId);
                      const to = nodes.find((node) => node.id === relationship.toId);

                      if (!from || !to) {
                        return null;
                      }

                      const curve = buildCurvePath(from, to);

                      return (
                        <g key={`mobile-${relationship.id}`}>
                          <path
                            d={curve.path}
                            stroke="rgba(148,163,184,0.72)"
                            strokeWidth="2.5"
                            fill="none"
                          />
                          <text
                            x={curve.labelX}
                            y={curve.labelY + 5}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#475569"
                          >
                            {relationship.label ?? relationship.type}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {nodes.map((node) => {
                    const isSelected = node.id === selectedNode?.id;

                    return (
                      <button
                        key={`mobile-${node.id}`}
                        type="button"
                        onPointerDown={(event) => handlePointerDown(event, node.id, mobileTotalScale)}
                        onClick={() => setSelectedId(node.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(node.id);
                          }
                        }}
                        className="absolute w-40 cursor-grab rounded-[28px] border bg-white p-4 text-left shadow-lg transition active:cursor-grabbing touch-none"
                        style={{
                          left: node.x,
                          top: node.y,
                          borderColor: isSelected ? node.color : "rgba(226,232,240,0.92)",
                          boxShadow: isSelected
                            ? `0 20px 40px ${node.color}33`
                            : "0 18px 35px rgba(15,23,42,0.08)",
                        }}
                      >
                        <div
                          className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white"
                          style={{ backgroundColor: node.color }}
                        >
                          <FontAwesomeIcon icon={faUserGroup} />
                        </div>
                        <p className="text-base font-semibold text-slate-900">{node.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{node.title}</p>
                        <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-400">
                          <FontAwesomeIcon icon={faArrowsUpDownLeftRight} />
                          drag
                        </div>
                      </button>
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
            className="relative h-[760px] overflow-auto bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.14),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.8),_rgba(248,250,252,0.96))]"
            onWheel={handleWheelZoom}
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
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              {relationships.map((relationship) => {
                const from = nodes.find((node) => node.id === relationship.fromId);
                const to = nodes.find((node) => node.id === relationship.toId);

                if (!from || !to) {
                  return null;
                }

                const curve = buildCurvePath(from, to);

                return (
                  <g key={relationship.id}>
                    <path
                      d={curve.path}
                      stroke="rgba(148,163,184,0.8)"
                      strokeWidth="2.5"
                      fill="none"
                    />
                    <rect
                      x={curve.labelX - 42}
                      y={curve.labelY - 12}
                      width="84"
                      height="24"
                      rx="12"
                      fill="rgba(255,255,255,0.88)"
                    />
                    <text
                      x={curve.labelX}
                      y={curve.labelY + 5}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#475569"
                    >
                      {relationship.label ?? relationship.type}
                    </text>
                  </g>
                );
              })}
            </svg>

            {nodes.map((node) => {
              const isSelected = node.id === selectedNode?.id;

              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(event) => handlePointerDown(event, node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(node.id);
                    }
                  }}
                  className="absolute w-40 cursor-grab rounded-[28px] border bg-white p-4 text-left shadow-lg transition hover:-translate-y-1 active:cursor-grabbing"
                  style={{
                    left: node.x,
                    top: node.y,
                    borderColor: isSelected ? node.color : "rgba(226,232,240,0.9)",
                    boxShadow: isSelected
                      ? `0 20px 40px ${node.color}33`
                      : "0 18px 35px rgba(15,23,42,0.08)",
                  }}
                >
                  <div
                    className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundColor: node.color }}
                  >
                    <FontAwesomeIcon icon={faUserGroup} />
                  </div>
                  <p className="text-base font-semibold text-slate-900">{node.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{node.title}</p>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-400">
                    <FontAwesomeIcon icon={faArrowsUpDownLeftRight} />
                    drag
                  </div>
                </div>
              );
            })}
            </div>
            </div>

            <div className="pointer-events-none absolute bottom-4 right-4 rounded-[24px] border border-slate-200/80 bg-white/92 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <FontAwesomeIcon icon={faLocationCrosshairs} className="text-orange-500" />
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
                        x1={(from.x + 80) * minimapScale}
                        y1={(from.y + 52) * minimapScale}
                        x2={(to.x + 80) * minimapScale}
                        y2={(to.y + 52) * minimapScale}
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
                  className="absolute rounded-xl border border-orange-300/80 bg-orange-200/10"
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
        <section className="rounded-[28px] border border-white/50 bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
              <FontAwesomeIcon icon={faBookOpen} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">선택한 인물</p>
              <h3 className="text-xl font-semibold text-slate-900">{selectedNode?.name}</h3>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-600">
              배경 메모
              <textarea
                value={selectedNode?.summary ?? ""}
                onChange={(event) => handleNodePatch("summary", event.target.value)}
                className="mt-2 h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300"
              />
            </label>

            <label className="block text-sm font-medium text-slate-600">
              주요 행동 메모
              <textarea
                value={selectedNode?.majorActions.join("\n") ?? ""}
                onChange={(event) => handleNodePatch("majorActions", event.target.value)}
                className="mt-2 h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <FontAwesomeIcon icon={faLink} className="text-orange-500" />
              연결된 관계
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {connectedRelationships.map((relationship) => (
                <span
                  key={relationship.id}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
                >
                  {relationship.label ?? relationship.type}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/50 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-orange-300">
              <FontAwesomeIcon icon={faPlus} />
            </div>
            <div>
              <p className="text-sm text-slate-300">인물 추가</p>
              <h3 className="text-xl font-semibold">
                {draft.linkedToSelected && selectedNode ? `${selectedNode.name}와 이어 붙이기` : "독립 인물로 추가"}
              </h3>
            </div>
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleCreateCharacter}>
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="인물 이름"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-300"
            />
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="역할 또는 호칭"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-300"
            />
            <textarea
              value={draft.summary}
              onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
              placeholder="인물 소개"
              className="h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-300"
            />
            <textarea
              value={draft.majorActions}
              onChange={(event) => setDraft((current) => ({ ...current, majorActions: event.target.value }))}
              placeholder="주요 행동을 줄바꿈으로 입력"
              className="h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-300"
            />
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={draft.linkedToSelected}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, linkedToSelected: event.target.checked }))
                }
                className="h-4 w-4 rounded border-white/30 bg-white/10 text-orange-400"
              />
              현재 인물과 연결하지 않고 독립 인물로 추가
            </label>
            <select
              disabled={!draft.linkedToSelected}
              value={draft.relationshipType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  relationshipType: event.target.value as RelationshipType,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-orange-300"
            >
              {relationOptions.map((option) => (
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
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-300"
              />
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            >
              <FontAwesomeIcon icon={faWandSparkles} />
              연결 인물 만들기
            </button>

            <button
              type="button"
              onClick={saveToGithub}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200"
            >
              <FontAwesomeIcon icon={faCloudArrowUp} />
              GitHub에 저장
            </button>

            <p
              className={`text-xs leading-6 ${
                saveState === "error"
                  ? "text-rose-300"
                  : saveState === "saved"
                    ? "text-emerald-300"
                    : "text-slate-300"
              }`}
            >
              {saveMessage}
            </p>
          </form>
        </section>
      </aside>
    </div>
  );
}