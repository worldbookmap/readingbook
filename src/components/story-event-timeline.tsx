"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faCalendarDays,
  faLink,
  faPlus,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { CharacterMapLibrary, CharacterNode, CharacterRelationship, StoryEventCard, StoryTimelineLibrary, StoryTimelineWork } from "@/lib/types";
import characterMapLibrary from "@/data/character-map-library.json";
import storyEventLibrary from "@/data/story-event-library.json";
import { CustomSelect } from "@/components/custom-select";
import { FloatingSyncMenu } from "@/components/floating-sync-menu";

const storageKey = "readingbook-story-event-library";
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

type StoryEventFlowNode = Node<StoryEventCard, "storyEventNode">;

function StoryEventNodeCard({ data, selected }: NodeProps<StoryEventFlowNode>) {
  return (
    <div
      data-card-root="true"
      className="relative w-[200px] rounded-[24px] border-2 bg-white p-4 text-left shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition sm:w-[260px]"
      style={{
        borderColor: selected ? data.color : "rgba(226,232,240,1)",
        boxShadow: selected ? `0 18px 40px ${data.color}33` : "0 18px 40px rgba(15,23,42,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        {data.yearLabel ? (
          <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: data.color }}>
            {data.yearLabel}
          </span>
        ) : (
          <span className="h-6 w-10 rounded-full bg-slate-100" aria-label="연도 없음" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">drag</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{data.title}</p>
      <p className="mt-1 text-[11px] text-slate-500">{data.chapter}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{data.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {data.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

const storyEventNodeTypes: NodeTypes = {
  storyEventNode: StoryEventNodeCard,
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

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.03)] outline-none transition-all duration-200 placeholder:text-slate-400 selection:bg-slate-200 selection:text-slate-900 hover:border-slate-300 focus:border-slate-700 focus:ring-4 focus:ring-slate-200/80 invalid:border-rose-300 invalid:text-rose-700 invalid:focus:ring-rose-100";
const textareaClassName = `${inputClassName} min-h-[110px] resize-y`;
const previewPalette = ["#fdf2f8", "#eff6ff", "#ecfeff", "#fef3c7", "#f5f3ff", "#dcfce7", "#fee2e2"];

function buildPreviewNodes(nodes: CharacterNode[]): Node[] {
  return nodes.map((node, index) => ({
    id: node.id,
    type: "default",
    position: { x: node.x, y: node.y },
    data: {
      label: node.name,
      subtitle: node.title,
      summary: node.summary || "설명을 추가해 보세요.",
      color: node.color || previewPalette[index % previewPalette.length],
    },
    draggable: false,
    style: {
      border: "1px solid rgba(148,163,184,0.5)",
      borderRadius: 20,
      background: "rgba(255,255,255,0.96)",
      padding: 0,
      boxShadow: "0 18px 36px rgba(15,23,42,0.08)",
      width: 210,
    },
  }));
}

function buildPreviewEdges(relationships: CharacterRelationship[]): Edge[] {
  return relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.fromId,
    target: relationship.toId,
    label: relationship.label ?? relationship.type,
    type: "smoothstep",
    animated: true,
    data: {
      type: relationship.type,
      label: relationship.label ?? relationship.type,
    },
    style: {
      stroke:
        relationship.type === "부부"
          ? "#f472b6"
          : relationship.type === "사업"
            ? "#f59e0b"
            : relationship.type === "자식"
              ? "#22c55e"
              : relationship.type === "커플"
                ? "#8b5cf6"
                : relationship.type === "친구"
                  ? "#3b82f6"
                  : "#64748b",
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color:
        relationship.type === "부부"
          ? "#f472b6"
          : relationship.type === "사업"
            ? "#f59e0b"
            : relationship.type === "자식"
              ? "#22c55e"
              : relationship.type === "커플"
                ? "#8b5cf6"
                : relationship.type === "친구"
                  ? "#3b82f6"
                  : "#64748b",
    },
  }));
}

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

function parseYear(yearLabel: string) {
  const cleaned = yearLabel.trim().toUpperCase();
  if (cleaned.startsWith("BC")) {
    const numeric = Number(cleaned.replace("BC", "").trim());
    return Number.isNaN(numeric) ? 0 : -numeric;
  }

  const numeric = Number(cleaned);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function buildInitialWorks(): StoryTimelineWork[] {
  return (storyEventLibrary as StoryTimelineLibrary).works;
}

type StoryEventFlowProps = {
  nodes: StoryEventFlowNode[];
  onNodesChange: ReturnType<typeof useNodesState<StoryEventFlowNode>>[2];
  onNodeClick: (node: StoryEventFlowNode) => void;
  onNodeDoubleClick: (node: StoryEventFlowNode) => void;
  onNodeDragStop: (node: StoryEventFlowNode) => void;
  onCreateEvent: (position: { x: number; y: number }) => void;
};

function StoryEventFlow({
  nodes,
  onNodesChange,
  onNodeClick,
  onNodeDoubleClick,
  onNodeDragStop,
  onCreateEvent,
}: StoryEventFlowProps) {
  const reactFlowInstance = useReactFlow();

  return (
    <ReactFlow
      nodes={nodes}
      edges={[]}
      onNodesChange={onNodesChange}
      onNodeClick={(_, node) => onNodeClick(node as StoryEventFlowNode)}
      onNodeDoubleClick={(_, node) => onNodeDoubleClick(node as StoryEventFlowNode)}
      onNodeDragStop={(_, node) => onNodeDragStop(node as StoryEventFlowNode)}
      onPaneClick={(event) => {
        if (event.detail !== 2) {
          return;
        }

        onCreateEvent(reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
      }}
      nodeTypes={storyEventNodeTypes}
      fitView
      fitViewOptions={{ padding: 0.25, minZoom: 0.4, maxZoom: 1.6 }}
      minZoom={0.4}
      maxZoom={1.6}
      defaultEdgeOptions={{ type: "smoothstep" }}
      proOptions={{ hideAttribution: true }}
      className="!bg-white"
    >
      <Background variant={BackgroundVariant.Lines} gap={48} size={1} color="rgba(148,163,184,0.18)" />
      <MiniMap
        pannable
        zoomable
        nodeColor={(node) => (node.data as StoryEventCard)?.color ?? "#f59e0b"}
        maskColor="rgba(255,255,255,0.72)"
      />
      <Controls />
    </ReactFlow>
  );
}

export function StoryEventTimeline() {
  const latestInitialWork = buildInitialWorks().at(-1) ?? buildInitialWorks()[0] ?? null;
  const [works, setWorks] = useState<StoryTimelineWork[]>(buildInitialWorks);
  const [selectedWorkId, setSelectedWorkId] = useState<string>(latestInitialWork?.id ?? "");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(latestInitialWork?.events[0]?.id ?? null);
  const [workDraft, setWorkDraft] = useState<WorkDraft>(defaultWorkDraft);
  const [eventDraft, setEventDraft] = useState<EventDraft>(defaultEventDraft);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("브라우저 로컬 저장 사용 중");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteSha, setRemoteSha] = useState<string | null>(null);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [characterWorks, setCharacterWorks] = useState<CharacterMapLibrary["works"]>(
    (characterMapLibrary as CharacterMapLibrary).works ?? [],
  );
  const [activeModal, setActiveModal] = useState<"work" | "event" | "edit" | "detail" | "linked" | null>(null);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [selectedLinkedNode, setSelectedLinkedNode] = useState<CharacterNode | null>(null);

  const orderedWorks = works;
  const selectedWork = works.find((work) => work.id === selectedWorkId) ?? works[0] ?? null;
  const selectedEvent = selectedWork?.events.find((event) => event.id === selectedEventId) ?? selectedWork?.events[0] ?? null;
  const detailEvent = selectedWork?.events.find((event) => event.id === detailEventId) ?? null;
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<StoryEventFlowNode>([]);

  const storyEventNodes = useMemo<StoryEventFlowNode[]>(
    () =>
      (selectedWork?.events ?? []).map((event) => ({
        id: event.id,
        type: "storyEventNode",
        position: { x: event.x, y: event.y },
        data: event,
        selected: event.id === selectedEvent?.id,
      })),
    [selectedEvent?.id, selectedWork],
  );

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

  const linkedPreviewNodes = useMemo(
    () => buildPreviewNodes(linkedCharacterWork?.seed?.nodes ?? []),
    [linkedCharacterWork],
  );
  const linkedPreviewEdges = useMemo(
    () => buildPreviewEdges(linkedCharacterWork?.seed?.relationships ?? []),
    [linkedCharacterWork],
  );


  useEffect(() => {
    async function loadCharacterWorks() {
      try {
        const response = await fetch("/api/character-map", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          data?: CharacterMapLibrary;
          remoteEnabled?: boolean;
          sha?: string | null;
        };

        if (payload.data?.works?.length) {
          setCharacterWorks(payload.data.works);
        }
      } catch {
        // ignore character-map fetch failures and keep the local fallback list
      }
    }

    void loadCharacterWorks();
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as StoryTimelineLibrary;
      if (parsed.works?.length) {
        const latestWork = parsed.works.at(-1) ?? parsed.works[0];
        setWorks(parsed.works);
        setSelectedWorkId(latestWork.id);
        setSelectedEventId(latestWork.events[0]?.id ?? null);
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

  useEffect(() => {
    setFlowNodes(storyEventNodes);
  }, [setFlowNodes, storyEventNodes]);

  function handleFlowNodeDragStop(node: StoryEventFlowNode) {
    setWorks((current) =>
      current.map((work) =>
        work.id === selectedWork?.id
          ? {
              ...work,
              events: work.events.map((event) =>
                event.id === node.id
                  ? { ...event, x: Math.round(node.position.x), y: Math.round(node.position.y) }
                  : event,
              ),
            }
          : work,
      ),
    );
  }

  function openAddWorkModal() {
    setEditingWorkId(null);
    setWorkDraft(defaultWorkDraft);
    setActiveModal("work");
  }

  function openEditWorkModal(workId: string) {
    const target = works.find((work) => work.id === workId);
    if (!target) {
      return;
    }

    setEditingWorkId(workId);
    setWorkDraft({
      title: target.titleKo ?? target.title,
      author: target.author ?? "",
      linkedCharacterWorkId: target.linkedCharacterWorkId ?? "",
    });
    setActiveModal("work");
  }

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

    if (editingWorkId) {
      setWorks((current) =>
        current.map((work) =>
          work.id === editingWorkId
            ? {
                ...work,
                title,
                titleKo: title,
                author: workDraft.author.trim() || work.author || "새 소설",
                linkedCharacterWorkId: matchedCharacter?.id ?? (workDraft.linkedCharacterWorkId || undefined),
              }
            : work,
        ),
      );
      setEditingWorkId(null);
      setActiveModal(null);
      setWorkDraft(defaultWorkDraft);
      return;
    }

    const nextWork: StoryTimelineWork = {
      id: crypto.randomUUID(),
      title,
      titleKo: title,
      author: workDraft.author.trim() || "새 소설",
      linkedCharacterWorkId: matchedCharacter?.id ?? (workDraft.linkedCharacterWorkId || undefined),
      events: [],
    };

    setWorks((current) => [nextWork, ...current.filter((work) => work.id !== nextWork.id)]);
    setSelectedWorkId(nextWork.id);
    setSelectedEventId(null);
    setWorkDraft(defaultWorkDraft);
    setActiveModal(null);
  }

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWork || !eventDraft.title.trim()) {
      return;
    }

    const nextIndex = selectedWork.events.length;
    const yearLabel = eventDraft.yearLabel.trim();
    const year = parseYear(yearLabel);
    const nextEvent: StoryEventCard = {
      id: crypto.randomUUID(),
      title: eventDraft.title.trim(),
      year,
      yearLabel,
      chapter: eventDraft.chapter.trim() || `챕터 ${nextIndex + 1}`,
      summary: eventDraft.summary.trim() || "사건 설명을 입력해 주세요.",
      tags: eventDraft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      x: 80 + (nextIndex % 4) * 200 + (nextIndex % 2) * 30,
      y: 70 + Math.floor(nextIndex / 4) * 160,
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

  function createEventAtBoardPosition(x: number, y: number, initialTitle?: string) {
    if (!selectedWork) {
      return;
    }

    const nextIndex = selectedWork.events.length;
    const nextEvent: StoryEventCard = {
      id: crypto.randomUUID(),
      title: initialTitle ?? `사건 ${nextIndex + 1}`,
      year: 0,
      yearLabel: "",
      chapter: `챕터 ${nextIndex + 1}`,
      summary: "새 사건을 입력해 주세요.",
      tags: [],
      x: Math.max(30, x),
      y: Math.max(30, y),
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
    setDetailEventId(nextEvent.id);
    setActiveModal("detail");
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

    const hasConfirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!hasConfirmed) return;

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
    window.alert("삭제 완료되었습니다.");
  }

  function deleteWorkEntry(workId: string) {
    const target = works.find((work) => work.id === workId);
    if (!target) return;

    const hasConfirmed = window.confirm(`"${target.titleKo ?? target.title}"을(를) 삭제하시겠습니까?`);
    if (!hasConfirmed) return;

    const nextWorks = works.filter((work) => work.id !== workId);
    setWorks(nextWorks);

    if (selectedWorkId === workId) {
      setSelectedWorkId(nextWorks[0]?.id ?? "");
      setSelectedEventId(nextWorks[0]?.events[0]?.id ?? null);
    }

    window.alert("삭제 완료되었습니다.");
  }

  function resetWorks() {
    const defaults = buildInitialWorks();
    setWorks(defaults);
    setSelectedWorkId(defaults[0]?.id ?? "");
    setSelectedEventId(defaults[0]?.events[0]?.id ?? null);
    window.localStorage.removeItem(storageKey);
  }

  async function refreshFromGithub() {
    setSaveMessage("GitHub 내용 불러오는 중...");

    try {
      const response = await fetch("/api/story-events", { cache: "no-store" });
      if (!response.ok) throw new Error("GitHub 내용을 불러오지 못했습니다.");

      const payload = (await response.json()) as {
        data?: StoryTimelineLibrary;
        remoteEnabled?: boolean;
        sha?: string | null;
      };
      const loadedWorks = payload.data?.works ?? [];
      if (loadedWorks.length) {
        setWorks(loadedWorks);
        setSelectedWorkId((current) => {
          const nextSelected = loadedWorks.some((work) => work.id === current) ? current : loadedWorks[0].id;
          setSelectedEventId(loadedWorks.find((work) => work.id === nextSelected)?.events[0]?.id ?? null);
          return nextSelected;
        });
      }
      setRemoteEnabled(Boolean(payload.remoteEnabled));
      setRemoteSha(payload.sha ?? null);
      setSaveMessage(payload.remoteEnabled ? "GitHub 내용이 갱신되었습니다." : "브라우저 로컬 저장 모드");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "GitHub 내용을 불러오지 못했습니다.");
    }
  }

  async function saveToGithub() {
    setSaveState("saving");
    setSaveMessage(remoteEnabled ? "저장 중..." : "브라우저 로컬 저장 중");

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
      window.alert("저장 완료! GitHub에 반영되었습니다.");
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

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
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
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">작품 선택</label>
              </div>
              <CustomSelect
                value={selectedWorkId === "" ? "__new__" : selectedWorkId}
                onChange={(nextValue) => {
                  if (nextValue === "__new__") {
                    openAddWorkModal();
                    return;
                  }

                  setSelectedWorkId(nextValue);
                }}
                onEditOption={(nextValue) => {
                  if (nextValue === "__new__") {
                    openAddWorkModal();
                    return;
                  }

                  openEditWorkModal(nextValue);
                }}
                onDeleteOption={(nextValue) => {
                  if (nextValue === "__new__") return;
                  deleteWorkEntry(nextValue);
                }}
                placeholder="작품 선택"
                className="w-full"
                options={[
                  { value: "__new__", label: "새 작품 추가" },
                  ...orderedWorks.map((work) => ({
                    value: work.id,
                    label: work.titleKo ?? work.title,
                  })),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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

          <div className="flex w-full flex-col gap-2 xl:max-w-xs">
            <CustomSelect
              value={selectedWork?.linkedCharacterWorkId ?? ""}
              onChange={(nextValue) => {
                setWorks((current) =>
                  current.map((work) =>
                    work.id === selectedWorkId
                      ? { ...work, linkedCharacterWorkId: nextValue || undefined }
                      : work,
                  ),
                );
              }}
              className="w-full"
              options={[
                { value: "", label: "연결된 작품 없음" },
                ...characterWorks.map((work) => ({
                  value: work.id,
                  label: work.titleKo ?? work.title,
                })),
              ]}
            />

            {linkedCharacterWork ? (
              <button
                type="button"
                onClick={() => setActiveModal("linked")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200/80"
              >
                <FontAwesomeIcon icon={faLink} />
                연결 작품 보기
              </button>
            ) : null}
          </div>
        </div>

        <FloatingSyncMenu saveMessage={saveMessage} onRefresh={refreshFromGithub} onSave={saveToGithub} />

        <div className="-mx-5 mt-5">
          <div className="mb-3">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>타임라인 보드</span>
              <span>{selectedWork?.events.length ?? 0}개 사건</span>
            </div>

            <div className="relative h-[720px] overflow-hidden rounded-[26px] border border-amber-200 bg-white shadow-inner sm:h-[560px]">
              <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal("event")}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  새 사건
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal("edit")}
                  disabled={!selectedEvent}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-[10px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                >
                  <FontAwesomeIcon icon={faCalendarDays} />
                  수정
                </button>
                <button
                  type="button"
                  onClick={resetWorks}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <FontAwesomeIcon icon={faRotateLeft} />
                  초기화
                </button>
              </div>

              <div className="h-full w-full pt-12">
                <ReactFlowProvider>
                  <StoryEventFlow
                    nodes={flowNodes}
                    onNodesChange={onFlowNodesChange}
                    onNodeClick={(node) => setSelectedEventId(node.id)}
                    onNodeDoubleClick={(node) => openDetailModal(node.id)}
                    onNodeDragStop={handleFlowNodeDragStop}
                    onCreateEvent={(position) => createEventAtBoardPosition(position.x - cardWidth / 2, position.y - cardHeight / 2)}
                  />
                </ReactFlowProvider>
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
              <form className="mt-5 space-y-3" onSubmit={addWork}>
                <input
                  value={workDraft.title}
                  onFocus={(event) => {
                    clearDefaultValueIfNeeded(
                      workDraft.title,
                      ["새 작품"],
                      (nextValue) => {
                        setWorkDraft((current) => ({ ...current, title: nextValue }));
                      },
                      event,
                    );
                  }}
                  onChange={(event) => setWorkDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="소설 제목"
                  className={inputClassName}
                />
                <input
                  value={workDraft.author}
                  onChange={(event) => setWorkDraft((current) => ({ ...current, author: event.target.value }))}
                  placeholder="작가명(선택)"
                  className={inputClassName}
                />
                <CustomSelect
                  value={workDraft.linkedCharacterWorkId}
                  onChange={(nextValue) =>
                    setWorkDraft((current) => ({ ...current, linkedCharacterWorkId: nextValue }))
                  }
                  className="w-full"
                  options={[
                    { value: "", label: "인물관계도와 연결하지 않음" },
                    ...characterWorks.map((work) => ({
                      value: work.id,
                      label: work.titleKo ?? work.title,
                    })),
                  ]}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setEditingWorkId(null); setActiveModal(null); setWorkDraft(defaultWorkDraft); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">취소</button>
                  <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                    {editingWorkId ? "수정하기" : "추가하기"}
                  </button>
                </div>
              </form>
            ) : null}

            {activeModal === "event" ? (
              <form className="mt-5 space-y-3" onSubmit={(event) => { addEvent(event); setActiveModal(null); }}>
                <input
                  value={eventDraft.title}
                  onFocus={(event) => {
                    clearDefaultValueIfNeeded(
                      eventDraft.title,
                      ["새 이벤트", "사건 제목"],
                      (nextValue) => {
                        setEventDraft((current) => ({ ...current, title: nextValue }));
                      },
                      event,
                    );
                  }}
                  onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="사건 제목"
                  className={inputClassName}
                />
                <input
                  value={eventDraft.yearLabel}
                  onFocus={(event) => {
                    clearDefaultValueIfNeeded(
                      eventDraft.yearLabel,
                      ["예: 1776 또는 BC 3000"],
                      (nextValue) => {
                        setEventDraft((current) => ({ ...current, yearLabel: nextValue }));
                      },
                      event,
                    );
                  }}
                  onChange={(event) => setEventDraft((current) => ({ ...current, yearLabel: event.target.value }))}
                  placeholder="예: 1776 또는 BC 3000"
                  className={inputClassName}
                />
                <input
                  value={eventDraft.chapter}
                  onFocus={(event) => {
                    clearDefaultValueIfNeeded(
                      eventDraft.chapter,
                      ["새 장면", "장면 or 챕터"],
                      (nextValue) => {
                        setEventDraft((current) => ({ ...current, chapter: nextValue }));
                      },
                      event,
                    );
                  }}
                  onChange={(event) => setEventDraft((current) => ({ ...current, chapter: event.target.value }))}
                  placeholder="장면 or 챕터"
                  className={inputClassName}
                />
                <textarea
                  value={eventDraft.summary}
                  onFocus={(event) => {
                    clearDefaultValueIfNeeded(
                      eventDraft.summary,
                      ["사건 설명", "이벤트 설명을 입력해 주세요."],
                      (nextValue) => {
                        setEventDraft((current) => ({ ...current, summary: nextValue }));
                      },
                      event,
                    );
                  }}
                  onChange={(event) => setEventDraft((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="사건 설명"
                  className={textareaClassName}
                />
                <input
                  value={eventDraft.tags}
                  onFocus={(event) => {
                    clearDefaultValueIfNeeded(
                      eventDraft.tags,
                      ["태그를 쉼표로 구분"],
                      (nextValue) => {
                        setEventDraft((current) => ({ ...current, tags: nextValue }));
                      },
                      event,
                    );
                  }}
                  onChange={(event) => setEventDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="태그를 쉼표로 구분"
                  className={inputClassName}
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
                  className={inputClassName}
                />
                <input
                  value={selectedEvent.yearLabel}
                  onChange={(event) => updateSelectedEvent("yearLabel", event.target.value)}
                  className={inputClassName}
                />
                <input
                  value={selectedEvent.chapter ?? ""}
                  onChange={(event) => updateSelectedEvent("chapter", event.target.value)}
                  className={inputClassName}
                />
                <textarea
                  value={selectedEvent.summary}
                  onChange={(event) => updateSelectedEvent("summary", event.target.value)}
                  className={textareaClassName}
                />
                <input
                  value={selectedEvent.tags.join(", ")}
                  onChange={(event) =>
                    updateSelectedEvent("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))
                  }
                  className={inputClassName}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">닫기</button>
                </div>
              </div>
            ) : null}

            {activeModal === "linked" && linkedCharacterWork ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">연결된 인물관계도</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-900">
                    {linkedCharacterWork.titleKo ?? linkedCharacterWork.title}
                  </h4>
                  <p className="mt-2 text-sm text-slate-600">
                    {linkedCharacterWork.author ? `작가: ${linkedCharacterWork.author}` : "작가 정보 없음"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    인물 수: {linkedCharacterWork.seed?.nodes?.length ?? 0}명 · 관계 수: {linkedCharacterWork.seed?.relationships?.length ?? 0}개
                  </p>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">인물관계도 미리보기</p>
                  <div className="relative mt-3 h-[280px] overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
                    {linkedPreviewNodes.length > 0 ? (
                      <ReactFlowProvider>
                        <ReactFlow
                          nodes={linkedPreviewNodes}
                          edges={linkedPreviewEdges}
                          fitView
                          fitViewOptions={{ padding: 0.25 }}
                          defaultEdgeOptions={{ type: "smoothstep", animated: true }}
                          nodesDraggable={false}
                          nodesConnectable={false}
                          elementsSelectable={false}
                          panOnDrag
                          zoomOnScroll
                          zoomOnPinch
                          onNodeClick={(_, node) => {
                            const clickedNode = linkedCharacterWork.seed?.nodes.find((item) => item.id === node.id) ?? null;
                            setSelectedLinkedNode(clickedNode);
                          }}
                          onPaneClick={() => setSelectedLinkedNode(null)}
                          proOptions={{ hideAttribution: true }}
                          className="!bg-slate-50"
                        >
                          <Background gap={18} size={1} color="#dfe7f1" />
                          <Controls showInteractive={false} />
                        </ReactFlow>
                      </ReactFlowProvider>
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-sm text-slate-500">
                        아직 등록된 인물관계도 노드가 없습니다.
                      </div>
                    )}

                    {selectedLinkedNode ? (
                      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_35px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">인물 정보</p>
                            <h5 className="mt-1 text-base font-semibold text-slate-900">{selectedLinkedNode.name}</h5>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedLinkedNode(null)}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600"
                          >
                            닫기
                          </button>
                        </div>
                        {selectedLinkedNode.title ? <p className="mt-2 text-xs text-slate-500">{selectedLinkedNode.title}</p> : null}
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {selectedLinkedNode.summary || "설명이 아직 등록되지 않았습니다."}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(selectedLinkedNode.majorActions ?? []).slice(0, 3).map((action) => (
                            <span key={action} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-600">
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <a
                  href={`/characters?workId=${encodeURIComponent(linkedCharacterWork.id)}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200/80"
                >
                  <FontAwesomeIcon icon={faLink} />
                  인물관계도 페이지 열기
                </a>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">닫기</button>
                </div>
              </div>
            ) : null}

            {activeModal === "detail" && detailEvent ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    {detailEvent.yearLabel ? (
                      <span className="rounded-full px-2 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: detailEvent.color }}>
                        {detailEvent.yearLabel}
                      </span>
                    ) : (
                      <span className="rounded-full border border-dashed border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                        연도 없음
                      </span>
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{detailEvent.chapter}</span>
                  </div>
                  <h4 className="mt-3 text-xl font-semibold text-slate-900">{detailEvent.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{detailEvent.summary}</p>
                </div>

                <div className="space-y-2.5">
                  <input
                    value={detailEvent.title}
                    onChange={(event) => updateSelectedEvent("title", event.target.value)}
                    className={inputClassName}
                  />
                  <input
                    value={detailEvent.yearLabel}
                    onChange={(event) => updateSelectedEvent("yearLabel", event.target.value)}
                    className={inputClassName}
                  />
                  <input
                    value={detailEvent.chapter ?? ""}
                    onChange={(event) => updateSelectedEvent("chapter", event.target.value)}
                    className={inputClassName}
                  />
                  <textarea
                    value={detailEvent.summary}
                    onChange={(event) => updateSelectedEvent("summary", event.target.value)}
                    className={textareaClassName}
                  />
                  <input
                    value={detailEvent.tags.join(", ")}
                    onChange={(event) =>
                      updateSelectedEvent("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))
                    }
                    className={inputClassName}
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200/80"
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
