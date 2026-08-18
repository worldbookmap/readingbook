"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  NodeTypes,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CharacterMapLibrary, CharacterNode, CharacterRelationship, RelationshipType } from "@/lib/types";
import { CustomSelect } from "@/components/custom-select";
import { FloatingSyncMenu } from "@/components/floating-sync-menu";

const storageKey = "readingbook-character-map-library";
const relationOptions: RelationshipType[] = ["친구", "부부", "커플", "자식", "사업", "기타"];

type CharacterFlowNodeData = {
  label: string;
  subtitle: string;
  summary: string;
  color: string;
};

type CharacterFlowNode = Node<CharacterFlowNodeData, "characterNode">;
type CharacterFlowEdge = Edge<{ type: RelationshipType; label?: string }>;

type Props = {
  library: CharacterMapLibrary;
  defaultWorkId?: string;
};

const colorPalette = ["#fdf2f8", "#eff6ff", "#ecfeff", "#fef3c7", "#f5f3ff", "#dcfce7", "#fee2e2"];

function toReactNodes(nodes: CharacterNode[]): CharacterFlowNode[] {
  return nodes.map((node, index) => ({
    id: node.id,
    type: "characterNode",
    position: { x: node.x, y: node.y },
    data: {
      label: node.name,
      subtitle: node.title,
      summary: node.summary || "설명을 추가해 보세요.",
      color: node.color || colorPalette[index % colorPalette.length],
    },
  }));
}

function toCharacterNodes(nodes: CharacterFlowNode[]): CharacterNode[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.data.label,
    title: node.data.subtitle,
    summary: node.data.summary,
    majorActions: [],
    x: Math.round(node.position.x),
    y: Math.round(node.position.y),
    color: node.data.color,
  }));
}

function toReactEdges(relationships: CharacterRelationship[]): CharacterFlowEdge[] {
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
      stroke: relationship.type === "부부" ? "#f472b6" : relationship.type === "사업" ? "#f59e0b" : relationship.type === "자식" ? "#22c55e" : relationship.type === "커플" ? "#8b5cf6" : relationship.type === "친구" ? "#3b82f6" : "#64748b",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: relationship.type === "부부" ? "#f472b6" : relationship.type === "사업" ? "#f59e0b" : relationship.type === "자식" ? "#22c55e" : relationship.type === "커플" ? "#8b5cf6" : relationship.type === "친구" ? "#3b82f6" : "#64748b",
    },
  }));
}

function toCharacterRelationships(edges: CharacterFlowEdge[]): CharacterRelationship[] {
  return edges.map((edge) => ({
    id: edge.id,
    fromId: edge.source,
    toId: edge.target,
    type: (edge.data?.type as RelationshipType) ?? "기타",
    label: typeof edge.label === "string" ? edge.label : edge.data?.label ?? undefined,
  }));
}

function CharacterNodeCard({ data, selected }: NodeProps<CharacterFlowNode>) {
  return (
    <div
      className="relative flex h-[140px] w-[140px] flex-col items-center justify-center rounded-full border-2 bg-white p-4 text-center shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:h-[170px] sm:w-[170px]"
      style={{
        background: `linear-gradient(180deg, ${data.color} 0%, rgba(255,255,255,0.88) 58%)`,
        borderColor: selected ? "#1f2937" : "rgba(148, 163, 184, 0.42)",
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-700" />
      <div className="mb-2 flex items-center justify-center gap-2">
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-700">
          person
        </span>
        <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold tracking-[-0.03em] text-slate-900">{data.label}</h3>
      <p className="mt-1 line-clamp-1 text-[10px] font-medium text-slate-500">{data.subtitle}</p>
      <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-slate-600">{data.summary}</p>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-slate-700" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  characterNode: CharacterNodeCard,
};

function clearDefaultValueIfNeeded(
  currentValue: string,
  defaults: string[],
  onClear: (nextValue: string) => void,
  event?: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
  const shouldReset = defaults.some((defaultValue) => defaultValue === currentValue);

  if (shouldReset) {
    onClear("");
  }

  if (event) {
    requestAnimationFrame(() => {
      event.currentTarget.select();
    });
  }
}

type CharacterMapFlowProps = {
  nodes: CharacterFlowNode[];
  edges: CharacterFlowEdge[];
  onNodesChange: ReturnType<typeof useNodesState<CharacterFlowNode>>[2];
  onEdgesChange: ReturnType<typeof useEdgesState<CharacterFlowEdge>>[2];
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: { clientX: number; clientY: number }, node: Node) => void;
  onEdgeClick: (event: { clientX: number; clientY: number }, edge: Edge) => void;
  onNodeDoubleClick: (event: { clientX: number; clientY: number }, node: Node) => void;
  addNodeAtPosition: (position?: { x: number; y: number }) => void;
  longPressTimerRef: React.RefObject<number | null>;
};

function CharacterMapFlow({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onNodeDoubleClick,
  addNodeAtPosition,
  longPressTimerRef,
}: CharacterMapFlowProps) {
  const reactFlowInstance = useReactFlow();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onPaneClick={(event) => {
        const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        if (event.detail === 2) {
          addNodeAtPosition(position);
        }
      }}
      onPointerDown={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest(".react-flow__node")) return;

        if (longPressTimerRef.current) {
          window.clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = window.setTimeout(() => {
          const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          addNodeAtPosition(position);
        }, 600);
      }}
      onPointerUp={() => {
        if (longPressTimerRef.current) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }}
      onPointerLeave={() => {
        if (longPressTimerRef.current) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      defaultEdgeOptions={{
        type: "smoothstep",
        animated: true,
      }}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={18} size={1} color="#dfe7f1" />
      <MiniMap
        pannable
        zoomable
        nodeColor={(node) => (node.data?.color as string) ?? "#c4b5fd"}
        maskColor="rgba(255,255,255,0.78)"
      />
      <Controls />
    </ReactFlow>
  );
}

export function CharacterMapClient({ library, defaultWorkId }: Props) {
  const latestWork = library.works.at(-1) ?? library.works[0] ?? null;
  const [works, setWorks] = useState<CharacterMapLibrary["works"]>(library.works);
  const [selectedWorkId, setSelectedWorkId] = useState<string>(
    defaultWorkId && library.works.some((work) => work.id === defaultWorkId)
      ? defaultWorkId
      : latestWork?.id ?? "",
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewWorkModalOpen, setIsNewWorkModalOpen] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nodeDraft, setNodeDraft] = useState<{ label: string; subtitle: string; summary: string } | null>(null);
  const [edgeDraft, setEdgeDraft] = useState<{ type: RelationshipType; label: string } | null>(null);
  const [newWorkTitle, setNewWorkTitle] = useState("");
  const [draftRelationType, setDraftRelationType] = useState<RelationshipType>("기타");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("GitHub 저장 준비 중");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteSha, setRemoteSha] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const selectedWork = useMemo(
    () => works.find((work) => work.id === selectedWorkId) ?? works[0] ?? null,
    [selectedWorkId, works],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<CharacterFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CharacterFlowEdge>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as CharacterMapLibrary;
      if (parsed.works?.length) {
        setWorks(parsed.works);
        const nextSelected = parsed.works.some((work) => work.id === selectedWorkId)
          ? selectedWorkId
          : parsed.works[0]?.id ?? "";
        setSelectedWorkId(nextSelected);
      }
    } catch {
      // ignore invalid cached data
    }
  }, []);

  useEffect(() => {
    async function loadRemoteData() {
      try {
        const response = await fetch("/api/character-map", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: CharacterMapLibrary;
          remoteEnabled?: boolean;
          sha?: string | null;
        };

        if (payload.data?.works?.length) {
          setWorks(payload.data.works);
          const nextSelected = payload.data.works.some((work) => work.id === selectedWorkId)
            ? selectedWorkId
            : payload.data.works[0]?.id ?? "";
          setSelectedWorkId(nextSelected);
        }

        setRemoteEnabled(Boolean(payload.remoteEnabled));
        setRemoteSha(payload.sha ?? null);
        setSaveMessage(payload.remoteEnabled ? "GitHub 동기화가 활성화되었습니다." : "GitHub 동기화가 비활성 상태입니다.");
      } catch {
        setSaveMessage("GitHub 연결 상태를 확인하는 중입니다.");
      }
    }

    void loadRemoteData();
  }, []);

  async function refreshFromGithub() {
    setSaveMessage("GitHub 내용 불러오는 중...");

    try {
      const response = await fetch("/api/character-map", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("GitHub 내용을 불러오지 못했습니다.");
      }

      const payload = (await response.json()) as {
        data?: CharacterMapLibrary;
        remoteEnabled?: boolean;
        sha?: string | null;
      };

      if (payload.data?.works?.length) {
        setWorks(payload.data.works);
        setSelectedWorkId((current) =>
          payload.data?.works?.some((work) => work.id === current)
            ? current
            : payload.data?.works?.[0]?.id ?? "",
        );
      }
      setRemoteEnabled(Boolean(payload.remoteEnabled));
      setRemoteSha(payload.sha ?? null);
      setSaveMessage(payload.remoteEnabled ? "GitHub 내용이 갱신되었습니다." : "GitHub 동기화가 비활성 상태입니다.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "GitHub 내용을 불러오지 못했습니다.");
    }
  }

  async function saveToGithub() {
    setSaveState("saving");
    setSaveMessage(remoteEnabled ? "저장 중..." : "GitHub 동기화 환경을 확인하는 중입니다.");

    try {
      const response = await fetch("/api/character-map", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ works, sha: remoteSha }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "GitHub 저장에 실패했습니다.");
      }

      const payload = (await response.json()) as { ok: true; sha: string };
      const refreshed = await fetch("/api/character-map", { cache: "no-store" });
      const refreshedPayload = refreshed.ok
        ? ((await refreshed.json()) as { data?: CharacterMapLibrary; remoteEnabled?: boolean; sha?: string | null })
        : null;

      if (refreshedPayload?.data?.works?.length) {
        setWorks(refreshedPayload.data.works);
      }

      setRemoteEnabled(Boolean(refreshedPayload?.remoteEnabled ?? remoteEnabled));
      setRemoteSha(payload.sha ?? refreshedPayload?.sha ?? remoteSha);
      setSaveState("saved");
      setSaveMessage("저장 완료! GitHub에 반영되었습니다.");
      window.alert("저장 완료! GitHub에 반영되었습니다.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "GitHub 저장에 실패했습니다.");
    }
  }

  useEffect(() => {
    if (!selectedWork) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const nextNodes = toReactNodes(selectedWork.seed.nodes);
    const nextEdges = toReactEdges(selectedWork.seed.relationships);

    setNodes((current) => {
      if (
        current.length === nextNodes.length &&
        current.every((node, index) => {
          const nextNode = nextNodes[index];
          if (!nextNode) return false;
          return (
            node.id === nextNode.id &&
            node.position.x === nextNode.position.x &&
            node.position.y === nextNode.position.y &&
            node.data.label === nextNode.data.label &&
            node.data.subtitle === nextNode.data.subtitle &&
            node.data.summary === nextNode.data.summary &&
            node.data.color === nextNode.data.color
          );
        })
      ) {
        return current;
      }

      return nextNodes;
    });

    setEdges((current) => {
      if (
        current.length === nextEdges.length &&
        current.every((edge, index) => {
          const nextEdge = nextEdges[index];
          if (!nextEdge) return false;
          return (
            edge.id === nextEdge.id &&
            edge.source === nextEdge.source &&
            edge.target === nextEdge.target &&
            edge.label === nextEdge.label &&
            edge.data?.type === nextEdge.data?.type &&
            edge.data?.label === nextEdge.data?.label
          );
        })
      ) {
        return current;
      }

      return nextEdges;
    });

    setSelectedNodeId((current) => current && nextNodes.some((node) => node.id === current) ? current : nextNodes[0]?.id ?? null);
    setSelectedEdgeId(null);
  }, [selectedWork]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ works }));
  }, [works]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  useEffect(() => {
    if (selectedNode) {
      setNodeDraft({
        label: selectedNode.data.label,
        subtitle: selectedNode.data.subtitle,
        summary: selectedNode.data.summary,
      });
    } else {
      setNodeDraft(null);
    }

    if (selectedEdge) {
      setEdgeDraft({
        type: (selectedEdge.data?.type as RelationshipType) ?? "기타",
        label: typeof selectedEdge.label === "string" ? selectedEdge.label : selectedEdge.data?.label ?? "",
      });
    } else {
      setEdgeDraft(null);
    }
  }, [selectedNode, selectedEdge]);

  function openDetailModal(nodeId?: string, edgeId?: string) {
    if (nodeId) {
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
    } else if (edgeId) {
      setSelectedEdgeId(edgeId);
      setSelectedNodeId(null);
    }
    setIsEditing(false);
    setIsDetailModalOpen(true);
  }

  function closeDetailModal() {
    setIsDetailModalOpen(false);
    setIsEditing(false);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setNodeDraft(null);
    setEdgeDraft(null);
  }

  function handleNodeSave() {
    if (!selectedNodeId || !nodeDraft) return;

    const nextNodes = nodes.map((node) =>
      node.id === selectedNodeId
        ? {
            ...node,
            data: {
              ...node.data,
              label: nodeDraft.label.trim() || "새 인물",
              subtitle: nodeDraft.subtitle.trim() || "새 인물",
              summary: nodeDraft.summary.trim(),
            },
          }
        : node,
    );

    setNodes(nextNodes);
    updateSelectedWorkSeed(nextNodes, edges);
    setIsEditing(false);
    setIsDetailModalOpen(false);
    setSelectedNodeId(null);
  }

  function handleEdgeSave() {
    if (!selectedEdgeId || !edgeDraft) return;

    const nextEdges = edges.map((edge) => {
      if (edge.id !== selectedEdgeId) return edge;

      const nextType = edgeDraft.type;
      return {
        ...edge,
        label: edgeDraft.label.trim() || nextType,
        data: {
          ...edge.data,
          type: nextType,
          label: edgeDraft.label.trim() || nextType,
        },
        style: {
          stroke:
            nextType === "부부"
              ? "#f472b6"
              : nextType === "사업"
                ? "#f59e0b"
                : nextType === "자식"
                  ? "#22c55e"
                  : nextType === "커플"
                    ? "#8b5cf6"
                    : nextType === "친구"
                      ? "#3b82f6"
                      : "#64748b",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color:
            nextType === "부부"
              ? "#f472b6"
              : nextType === "사업"
                ? "#f59e0b"
                : nextType === "자식"
                  ? "#22c55e"
                  : nextType === "커플"
                    ? "#8b5cf6"
                    : nextType === "친구"
                      ? "#3b82f6"
                      : "#64748b",
        },
      };
    });

    setEdges(nextEdges);
    updateSelectedWorkSeed(nodes, nextEdges);
    setIsEditing(false);
    setIsDetailModalOpen(false);
    setSelectedEdgeId(null);
  }

  function handleRelationshipDelete() {
    const hasConfirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!hasConfirmed) return;

    if (selectedEdgeId) {
      const nextEdges = edges.filter((edge) => edge.id !== selectedEdgeId);
      setEdges(nextEdges);
      updateSelectedWorkSeed(nodes, nextEdges);
      setSelectedEdgeId(null);
      setIsDetailModalOpen(false);
      setIsEditing(false);
      window.alert("삭제 완료되었습니다.");
      return;
    }

    if (selectedNodeId) {
      const nextNodes = nodes.filter((node) => node.id !== selectedNodeId);
      const nextEdges = edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId);
      setNodes(nextNodes);
      setEdges(nextEdges);
      updateSelectedWorkSeed(nextNodes, nextEdges);
      setSelectedNodeId(null);
      setIsDetailModalOpen(false);
      setIsEditing(false);
      window.alert("삭제 완료되었습니다.");
    }
  }

  function createNewWork() {
    const title = newWorkTitle.trim();
    if (!title) return;

    if (editingWorkId) {
      setWorks((current) =>
        current.map((work) =>
          work.id === editingWorkId
            ? {
                ...work,
                title,
                titleKo: title,
              }
            : work,
        ),
      );

      setEditingWorkId(null);
      setNewWorkTitle("");
      setIsNewWorkModalOpen(false);
      return;
    }

    const nextWork = {
      id: crypto.randomUUID(),
      title,
      titleKo: title,
      author: "새 작품",
      seed: {
        nodes: [
          {
            id: crypto.randomUUID(),
            name: "주인공",
            title: "중심 인물",
            summary: "이 인물이 이야기에 어떤 위치를 차지하는지 적어보세요.",
            majorActions: [],
            x: 220,
            y: 180,
            color: colorPalette[0],
          },
        ],
        relationships: [],
      },
    };

    setWorks((current) => [nextWork, ...current]);
    setSelectedWorkId(nextWork.id);
    setNewWorkTitle("");
    setIsNewWorkModalOpen(false);
  }

  function deleteWork(workId: string) {
    const target = works.find((work) => work.id === workId);
    if (!target) return;

    const shouldDelete = window.confirm(`"${target.titleKo ?? target.title}"을(를) 삭제하시겠습니까?`);
    if (!shouldDelete) return;

    const nextWorks = works.filter((work) => work.id !== workId);
    setWorks(nextWorks);

    if (selectedWorkId === workId) {
      setSelectedWorkId(nextWorks[0]?.id ?? "");
    }

    if (!nextWorks.length) {
      setNodes([]);
      setEdges([]);
    }

    window.alert("삭제 완료되었습니다.");
  }

  function updateSelectedWorkSeed(nextNodes: CharacterFlowNode[], nextEdges: CharacterFlowEdge[]) {
    if (!selectedWorkId) return;

    setWorks((current) =>
      current.map((work) =>
        work.id === selectedWorkId
          ? {
              ...work,
              seed: {
                nodes: toCharacterNodes(nextNodes),
                relationships: toCharacterRelationships(nextEdges),
              },
            }
          : work,
      ),
    );
  }

  function addNodeAtPosition(position?: { x: number; y: number }) {
    if (!selectedWork) return;

    const nextId = crypto.randomUUID();
    const nextNode: CharacterFlowNode = {
      id: nextId,
      type: "characterNode",
      position: {
        x: position?.x ?? 180 + (nodes.length % 4) * 180,
        y: position?.y ?? 140 + (nodes.length % 3) * 150,
      },
      data: {
        label: `인물 ${nodes.length + 1}`,
        subtitle: "새 인물",
        summary: "이 인물의 역할을 적어보세요.",
        color: colorPalette[nodes.length % colorPalette.length],
      },
    };

    setNodes((current) => {
      const updated = [...current, nextNode];
      updateSelectedWorkSeed(updated, edges);
      return updated;
    });
    setSelectedNodeId(nextId);
    setSelectedEdgeId(null);
  }

  function addNode() {
    addNodeAtPosition();
  }

  function removeSelected() {
    const hasConfirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!hasConfirmed) return;

    if (selectedNodeId) {
      const nextNodes = nodes.filter((node) => node.id !== selectedNodeId);
      const nextEdges = edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId);
      setNodes(nextNodes);
      setEdges(nextEdges);
      updateSelectedWorkSeed(nextNodes, nextEdges);
      setSelectedNodeId(null);
      window.alert("삭제 완료되었습니다.");
      return;
    }

    if (selectedEdgeId) {
      const nextEdges = edges.filter((edge) => edge.id !== selectedEdgeId);
      setEdges(nextEdges);
      updateSelectedWorkSeed(nodes, nextEdges);
      setSelectedEdgeId(null);
      window.alert("삭제 완료되었습니다.");
    }
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;

    const newEdge: CharacterFlowEdge = {
      id: `edge-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      label: draftRelationType,
      type: "smoothstep",
      animated: true,
      data: {
        type: draftRelationType,
        label: draftRelationType,
      },
      style: { stroke: draftRelationType === "부부" ? "#f472b6" : draftRelationType === "사업" ? "#f59e0b" : draftRelationType === "자식" ? "#22c55e" : draftRelationType === "커플" ? "#8b5cf6" : draftRelationType === "친구" ? "#3b82f6" : "#64748b" },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: draftRelationType === "부부" ? "#f472b6" : draftRelationType === "사업" ? "#f59e0b" : draftRelationType === "자식" ? "#22c55e" : draftRelationType === "커플" ? "#8b5cf6" : draftRelationType === "친구" ? "#3b82f6" : "#64748b",
      },
    };

    const nextEdges = [...edges, newEdge];
    setEdges(nextEdges);
    updateSelectedWorkSeed(nodes, nextEdges);
    setSelectedEdgeId(newEdge.id);
    setSelectedNodeId(null);
  }

  function handleNodeFieldChange(field: "label" | "subtitle" | "summary", value: string) {
    if (!selectedNodeId) return;

    const nextNodes = nodes.map((node) =>
      node.id === selectedNodeId
        ? {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          }
        : node,
    );
    setNodes(nextNodes);
    updateSelectedWorkSeed(nextNodes, edges);
  }

  function handleEdgeFieldChange(field: "label" | "type", value: string) {
    if (!selectedEdgeId) return;

    const nextEdges = edges.map((edge) => {
      if (edge.id !== selectedEdgeId) return edge;

      const nextType = field === "type" ? (value as RelationshipType) : (edge.data?.type ?? "기타");
      return {
        ...edge,
        label: field === "label" ? value : nextType,
        data: {
          ...edge.data,
          type: nextType,
          label: field === "label" ? value : nextType,
        },
        style: {
          stroke:
            nextType === "부부"
              ? "#f472b6"
              : nextType === "사업"
                ? "#f59e0b"
                : nextType === "자식"
                  ? "#22c55e"
                  : nextType === "커플"
                    ? "#8b5cf6"
                    : nextType === "친구"
                      ? "#3b82f6"
                      : "#64748b",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color:
            nextType === "부부"
              ? "#f472b6"
              : nextType === "사업"
                ? "#f59e0b"
                : nextType === "자식"
                  ? "#22c55e"
                  : nextType === "커플"
                    ? "#8b5cf6"
                    : nextType === "친구"
                      ? "#3b82f6"
                      : "#64748b",
        },
      };
    });
    setEdges(nextEdges);
    updateSelectedWorkSeed(nodes, nextEdges);
  }

  return (
    <>
      {isNewWorkModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_26px_72px_rgba(15,23,42,0.16)]">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{editingWorkId ? "Edit Work" : "New Work"}</p>
              <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-900">
                {editingWorkId ? "작품 이름 수정" : "새 작품 추가"}
              </h3>
            </div>

            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">작품 이름</label>
            <input
              value={newWorkTitle}
              onChange={(event) => setNewWorkTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  createNewWork();
                }
              }}
              placeholder="예: 오만과 편견"
              autoFocus
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
            />

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewWorkTitle("");
                  setEditingWorkId(null);
                  setIsNewWorkModalOpen(false);
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={createNewWork}
                disabled={!newWorkTitle.trim()}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {editingWorkId ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <section className="overflow-hidden rounded-[32px] border border-slate-300/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Character Map</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">인물 관계도</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={addNode}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200/80 active:scale-[0.98] sm:px-3.5 sm:text-xs"
            >
              <span aria-hidden="true">＋</span>
              인물 추가
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingWorkId(null);
                setNewWorkTitle("");
                setIsNewWorkModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 active:scale-[0.98] sm:px-3.5 sm:text-xs"
            >
              <span aria-hidden="true">＋</span>
              작품 추가
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">작품 선택</p>
            <div className="mt-2">
              <CustomSelect
                value={selectedWorkId}
                onChange={setSelectedWorkId}
                onEditOption={(nextValue) => {
                  const target = works.find((work) => work.id === nextValue);
                  if (!target) return;

                  setEditingWorkId(nextValue);
                  setNewWorkTitle(target.titleKo ?? target.title);
                  setIsNewWorkModalOpen(true);
                }}
                onDeleteOption={deleteWork}
                options={works.map((work) => ({
                  value: work.id,
                  label: work.titleKo ?? work.title,
                }))}
              />
            </div>
          </div>
        </div>

        <div className="h-[660px] w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_35%),linear-gradient(180deg,_#fff_0%,_#f8fafc_100%)]">
          <ReactFlowProvider>
            <CharacterMapFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={(_, node) => {
                openDetailModal(node.id);
              }}
              onEdgeClick={(_, edge) => {
                openDetailModal(undefined, edge.id);
              }}
              onNodeDoubleClick={(_, node) => {
                openDetailModal(node.id);
              }}
              addNodeAtPosition={addNodeAtPosition}
              longPressTimerRef={longPressTimerRef}
            />
          </ReactFlowProvider>
        </div>
      </section>

      <aside className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 pb-28 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Editor</p>
            <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-900">정보 편집</h3>
          </div>
          {(selectedNodeId || selectedEdgeId) && (
            <button
              type="button"
              onClick={removeSelected}
              className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700"
            >
              삭제
            </button>
          )}
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">저장 상태</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{saveMessage}</p>
        </div>

        {selectedNode ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">인물 이름</label>
              <input
                value={selectedNode.data.label}
                onFocus={(event) => {
                  clearDefaultValueIfNeeded(
                    selectedNode.data.label,
                    ["인물 이름"],
                    (nextValue) => {
                      handleNodeFieldChange("label", nextValue);
                    },
                    event,
                  );
                }}
                onChange={(event) => handleNodeFieldChange("label", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">호칭/역할</label>
              <input
                value={selectedNode.data.subtitle}
                onFocus={(event) => {
                  clearDefaultValueIfNeeded(
                    selectedNode.data.subtitle,
                    ["새 인물"],
                    (nextValue) => {
                      handleNodeFieldChange("subtitle", nextValue);
                    },
                    event,
                  );
                }}
                onChange={(event) => handleNodeFieldChange("subtitle", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">한 줄 설명</label>
              <textarea
                value={selectedNode.data.summary}
                onFocus={(event) => {
                  clearDefaultValueIfNeeded(
                    selectedNode.data.summary,
                    ["이 인물의 역할을 적어보세요."],
                    (nextValue) => {
                      handleNodeFieldChange("summary", nextValue);
                    },
                    event,
                  );
                }}
                onChange={(event) => handleNodeFieldChange("summary", event.target.value)}
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              />
            </div>
          </div>
        ) : selectedEdge ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">관계 유형</label>
              <select
                value={selectedEdge.data?.type ?? "기타"}
                onChange={(event) => handleEdgeFieldChange("type", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              >
                {relationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">연결 설명</label>
              <textarea
                value={typeof selectedEdge.label === "string" ? selectedEdge.label : String(selectedEdge.label ?? "")}
                onFocus={(event) => {
                  const defaultValues = [selectedEdge.data?.type ?? "기타", "관계 설명을 추가해 보세요."];
                  clearDefaultValueIfNeeded(
                    typeof selectedEdge.label === "string" ? selectedEdge.label : String(selectedEdge.label ?? ""),
                    defaultValues,
                    (nextValue) => {
                      handleEdgeFieldChange("label", nextValue);
                    },
                    event,
                  );
                }}
                onChange={(event) => handleEdgeFieldChange("label", event.target.value)}
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              />
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 text-sm leading-6 text-violet-700">
              노드끼리 연결하면 새 관계가 생깁니다. 관계 유형과 설명을 적으면 서사적 의미를 더 잘 남길 수 있어요.
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
            인물을 클릭해 정보를 수정하거나, 노드 핸들을 드래그해서 다른 인물과 관계를 연결해 보세요.
          </div>
        )}

        <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">기본 관계 유형</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {relationOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDraftRelationType(type)}
                className={`rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition ${
                  draftRelationType === type
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <FloatingSyncMenu saveMessage={saveMessage} onRefresh={refreshFromGithub} onSave={saveToGithub} />

      {isDetailModalOpen && (selectedNode || selectedEdge) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_26px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">{selectedNode ? "Person" : "Relationship"}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                  {selectedNode ? (isEditing ? nodeDraft?.label || "새 인물" : selectedNode.data.label) : isEditing ? edgeDraft?.type || "관계" : selectedEdge?.data?.type ?? "관계"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-base text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                      aria-label="수정"
                      title="수정"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={handleRelationshipDelete}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-base text-rose-600 transition hover:bg-rose-100"
                      aria-label="삭제"
                      title="삭제"
                    >
                      🗑
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  aria-label="닫기"
                  title="닫기"
                >
                  ✕
                </button>
              </div>
            </div>

            {!isEditing && selectedNode && (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">호칭/역할</p>
                  <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    {selectedNode.data.subtitle}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">한 줄 설명</p>
                  <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-700">
                    {selectedNode.data.summary}
                  </p>
                </div>
              </div>
            )}

            {!isEditing && selectedEdge && (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">관계 유형</p>
                  <p className="mt-2 rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700">
                    {selectedEdge.data?.type ?? "기타"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">연결 설명</p>
                  <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-700">
                    {typeof selectedEdge.label === "string" ? selectedEdge.label : selectedEdge.data?.label ?? "설명이 아직 없습니다."}
                  </p>
                </div>
              </div>
            )}

            {isEditing && selectedNode && nodeDraft && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">인물 이름</label>
                  <input
                    value={nodeDraft.label}
                    onFocus={(event) => {
                      clearDefaultValueIfNeeded(
                        nodeDraft.label,
                        ["인물 이름"],
                        (nextValue) => {
                          setNodeDraft((current) => (current ? { ...current, label: nextValue } : current));
                        },
                        event,
                      );
                    }}
                    onChange={(event) => setNodeDraft((current) => (current ? { ...current, label: event.target.value } : current))}
                    placeholder="인물 이름"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">호칭/역할</label>
                  <input
                    value={nodeDraft.subtitle}
                    onFocus={(event) => {
                      clearDefaultValueIfNeeded(
                        nodeDraft.subtitle,
                        ["새 인물"],
                        (nextValue) => {
                          setNodeDraft((current) => (current ? { ...current, subtitle: nextValue } : current));
                        },
                        event,
                      );
                    }}
                    onChange={(event) => setNodeDraft((current) => (current ? { ...current, subtitle: event.target.value } : current))}
                    placeholder="호칭/역할"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">한 줄 설명</label>
                  <textarea
                    value={nodeDraft.summary}
                    onFocus={(event) => {
                      clearDefaultValueIfNeeded(
                        nodeDraft.summary,
                        ["이 인물의 역할을 적어보세요."],
                        (nextValue) => {
                          setNodeDraft((current) => (current ? { ...current, summary: nextValue } : current));
                        },
                        event,
                      );
                    }}
                    onChange={(event) => setNodeDraft((current) => (current ? { ...current, summary: event.target.value } : current))}
                    rows={5}
                    placeholder="이 인물의 역할을 적어보세요."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  />
                </div>
              </div>
            )}

            {isEditing && selectedEdge && edgeDraft && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">관계 유형</label>
                  <select
                    value={edgeDraft.type}
                    onChange={(event) => setEdgeDraft((current) => (current ? { ...current, type: event.target.value as RelationshipType } : current))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  >
                    {relationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">연결 설명</label>
                  <textarea
                    value={edgeDraft.label}
                    onFocus={(event) => {
                      clearDefaultValueIfNeeded(
                        edgeDraft.label,
                        ["관계 설명을 추가해 보세요.", selectedEdge?.data?.type ?? "기타"],
                        (nextValue) => {
                          setEdgeDraft((current) => (current ? { ...current, label: nextValue } : current));
                        },
                        event,
                      );
                    }}
                    onChange={(event) => setEdgeDraft((current) => (current ? { ...current, label: event.target.value } : current))}
                    rows={5}
                    placeholder="관계 설명을 추가해 보세요."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition selection:bg-slate-200 selection:text-slate-900 focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  />
                </div>
              </div>
            )}

            {isEditing && (
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={selectedNode ? handleNodeSave : handleEdgeSave}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  저장
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
