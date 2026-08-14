"use client";

import { useEffect, useMemo, useState } from "react";
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
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CharacterMapLibrary, CharacterNode, CharacterRelationship, RelationshipType } from "@/lib/types";
import { CustomSelect } from "@/components/custom-select";

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
      className="relative w-[210px] rounded-[24px] border-2 bg-white p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
      style={{
        background: `linear-gradient(180deg, ${data.color} 0%, rgba(255,255,255,0.88) 58%)`,
        borderColor: selected ? "#1f2937" : "rgba(148, 163, 184, 0.42)",
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-700" />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-700">
          person
        </span>
        <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
      </div>
      <h3 className="text-sm font-semibold tracking-[-0.03em] text-slate-900">{data.label}</h3>
      <p className="mt-1 text-[10px] font-medium text-slate-500">{data.subtitle}</p>
      <p className="mt-2 text-[11px] leading-5 text-slate-600">{data.summary}</p>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-slate-700" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  characterNode: CharacterNodeCard,
};

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
  const [newWorkTitle, setNewWorkTitle] = useState("");
  const [draftRelationType, setDraftRelationType] = useState<RelationshipType>("기타");

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

  function createNewWork() {
    const title = newWorkTitle.trim();
    if (!title) return;

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

  function addNode() {
    if (!selectedWork) return;

    const nextId = crypto.randomUUID();
    const nextNode: CharacterFlowNode = {
      id: nextId,
      type: "characterNode",
      position: {
        x: 180 + (nodes.length % 4) * 180,
        y: 140 + (nodes.length % 3) * 150,
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

  function removeSelected() {
    if (selectedNodeId) {
      const nextNodes = nodes.filter((node) => node.id !== selectedNodeId);
      const nextEdges = edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId);
      setNodes(nextNodes);
      setEdges(nextEdges);
      updateSelectedWorkSeed(nextNodes, nextEdges);
      setSelectedNodeId(null);
      return;
    }

    if (selectedEdgeId) {
      const nextEdges = edges.filter((edge) => edge.id !== selectedEdgeId);
      setEdges(nextEdges);
      updateSelectedWorkSeed(nodes, nextEdges);
      setSelectedEdgeId(null);
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
      <section className="overflow-hidden rounded-[32px] border border-slate-300/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Character Map</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">인물 관계도</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addNode}
              className="rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.12)]"
            >
              + 인물 추가
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-4 sm:px-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">작품 선택</p>
              <div className="mt-2">
                <CustomSelect
                  value={selectedWorkId}
                  onChange={setSelectedWorkId}
                  options={works.map((work) => ({
                    value: work.id,
                    label: work.titleKo ?? work.title,
                  }))}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">새 작품</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={newWorkTitle}
                  onChange={(event) => setNewWorkTitle(event.target.value)}
                  placeholder="작품 이름"
                  className="w-full rounded-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                />
                <button
                  type="button"
                  onClick={createNewWork}
                  className="rounded-full bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-[660px] w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_35%),linear-gradient(180deg,_#fff_0%,_#f8fafc_100%)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
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
        </div>
      </section>

      <aside className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm">
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

        {selectedNode ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">인물 이름</label>
              <input
                value={selectedNode.data.label}
                onChange={(event) => handleNodeFieldChange("label", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">호칭/역할</label>
              <input
                value={selectedNode.data.subtitle}
                onChange={(event) => handleNodeFieldChange("subtitle", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">한 줄 설명</label>
              <textarea
                value={selectedNode.data.summary}
                onChange={(event) => handleNodeFieldChange("summary", event.target.value)}
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
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
                onChange={(event) => handleEdgeFieldChange("label", event.target.value)}
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
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
    </div>
  );
}
