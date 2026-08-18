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
import { CustomSelect } from "@/components/custom-select";
import { FloatingSyncMenu } from "@/components/floating-sync-menu";

type KeywordNodeData = {
  label: string;
  description: string;
  color: string;
  size?: number;
  category?: string;
  tags?: string[];
};

type KeywordNode = Node<KeywordNodeData, "keywordNode">;
type KeywordEdge = Edge<{ label?: string }>;
type SavedMindmapDocument = {
  id: string;
  title: string;
  updatedAt: string;
  nodes: KeywordNode[];
  edges: KeywordEdge[];
};

const storageKey = "readingbook-keyword-mindmap";
const documentsStorageKey = "readingbook-keyword-mindmap-documents";

const colorPalette = [
  "#fdf2f8",
  "#eff6ff",
  "#ecfeff",
  "#fef3c7",
  "#f5f3ff",
  "#dcfce7",
];

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

const initialNodes: KeywordNode[] = [
  {
    id: "theme-core",
    type: "keywordNode",
    position: { x: 240, y: 120 },
    data: {
      label: "책의 중심 주제",
      description: "이야기의 핵심 감정과 메시지를 한 줄로 압축한 키워드입니다.",
      color: "#fdf2f8",
      category: "concept",
      tags: [],
    },
  },
  {
    id: "memory",
    type: "keywordNode",
    position: { x: 500, y: 80 },
    data: {
      label: "기억의 잔상",
      description: "상처와 행복이 섞여 남는 인상적인 장면과 감정의 흐름입니다.",
      color: "#ecfeff",
      category: "concept",
      tags: [],
    },
  },
  {
    id: "choice",
    type: "keywordNode",
    position: { x: 500, y: 260 },
    data: {
      label: "선택의 순간",
      description: "인물의 행동을 결정짓는 갈등과 타이밍을 남겼습니다.",
      color: "#fef3c7",
      category: "concept",
      tags: [],
    },
  },
  {
    id: "relationship",
    type: "keywordNode",
    position: { x: 760, y: 180 },
    data: {
      label: "관계의 균형",
      description: "인물 간의 신뢰와 경계가 어떻게 변화하는지 정리하는 핵심 단어입니다.",
      color: "#eff6ff",
      category: "concept",
      tags: [],
    },
  },
  {
    id: "ending",
    type: "keywordNode",
    position: { x: 240, y: 340 },
    data: {
      label: "결말의 여운",
      description: "마지막 장면에서 남는 의미와 구조적 메시지를 정리해두면 좋습니다.",
      color: "#dcfce7",
      category: "concept",
      tags: [],
    },
  },
];

const initialEdges: KeywordEdge[] = [
  {
    id: "e-core-memory",
    source: "theme-core",
    target: "memory",
    label: "감정이 자리를 잡는다",
    animated: true,
    style: { stroke: "#8b5cf6" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
    type: "smoothstep",
  },
  {
    id: "e-core-choice",
    source: "theme-core",
    target: "choice",
    label: "결정의 계기가 된다",
    animated: true,
    style: { stroke: "#f59e0b" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
    type: "smoothstep",
  },
  {
    id: "e-memory-relationship",
    source: "memory",
    target: "relationship",
    label: "과거가 현재를 만든다",
    animated: true,
    style: { stroke: "#0ea5e9" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
    type: "smoothstep",
  },
  {
    id: "e-choice-ending",
    source: "choice",
    target: "ending",
    label: "결말을 앞당기는 선택",
    animated: true,
    style: { stroke: "#22c55e" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
    type: "smoothstep",
  },
];

function KeywordNodeCard({ data, selected }: NodeProps<KeywordNode>) {
  return (
    <div
      className="relative rounded-[24px] border-2 bg-white p-3 shadow-[0_18px_38px_rgba(15,23,42,0.08)]"
      style={{
        width: data.size ?? 200,
        background: `linear-gradient(180deg, ${data.color} 0%, rgba(255,255,255,0.96) 52%)`,
        borderColor: selected ? "#8b5cf6" : "rgba(148, 163, 184, 0.35)",
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-700" />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-700">
          {data.category || "concept"}
        </span>
        <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
      </div>
      <h3 className="text-sm font-semibold tracking-[-0.03em] text-slate-900">{data.label}</h3>
      <p className="mt-2 text-[11px] leading-5 text-slate-600">{data.description}</p>
      {data.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-white/75 px-2 py-1 text-[9px] font-medium text-violet-700">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-slate-700" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  keywordNode: KeywordNodeCard,
};

type KeywordMindmapFlowProps = {
  nodes: KeywordNode[];
  edges: KeywordEdge[];
  onNodesChange: ReturnType<typeof useNodesState<KeywordNode>>[2];
  onEdgesChange: ReturnType<typeof useEdgesState<KeywordEdge>>[2];
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: { clientX: number; clientY: number }, node: Node) => void;
  onNodeDoubleClick: (node: KeywordNode) => void;
  onEdgeClick: (event: { clientX: number; clientY: number }, edge: Edge) => void;
  addKeywordAtPosition: (position?: { x: number; y: number }) => void;
};

function KeywordMindmapFlow({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  addKeywordAtPosition,
}: KeywordMindmapFlowProps) {
  const reactFlowInstance = useReactFlow();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={(_, node) => onNodeDoubleClick(node as KeywordNode)}
      onEdgeClick={onEdgeClick}
      onPaneClick={(event) => {
        const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        if (event.detail === 2) {
          addKeywordAtPosition(position);
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
        maskColor="rgba(255,255,255,0.75)"
      />
      <Controls />
    </ReactFlow>
  );
}

function makeBlankDocument(title: string, nextNodes: KeywordNode[] = initialNodes, nextEdges: KeywordEdge[] = initialEdges): SavedMindmapDocument {
  return {
    id: crypto.randomUUID(),
    title,
    updatedAt: new Date().toISOString(),
    nodes: nextNodes,
    edges: nextEdges,
  };
}

export function KeywordMindmap() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [documents, setDocuments] = useState<SavedMindmapDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [documentTitle, setDocumentTitle] = useState("문서 1");
  const [newDocumentTitle, setNewDocumentTitle] = useState("");
  const [isNewDocumentModalOpen, setIsNewDocumentModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [nodeDraft, setNodeDraft] = useState({ label: "", category: "", description: "", tags: "", color: "#f5f3ff", size: "200" });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialNodes[0].id);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("GitHub 저장 준비 중");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteSha, setRemoteSha] = useState<string | null>(null);

  function applyDocument(document: SavedMindmapDocument) {
    setNodes(document.nodes);
    setEdges(document.edges);
    setSelectedDocumentId(document.id);
    setDocumentTitle(document.title);
    setSelectedNodeId(document.nodes[0]?.id ?? null);
    setSelectedEdgeId(null);
  }

  function openNodeEditModal(node: KeywordNode) {
    setEditingNodeId(node.id);
    setNodeDraft({
      label: node.data.label,
      category: node.data.category ?? "concept",
      description: node.data.description,
      tags: node.data.tags?.join(", ") ?? "",
      color: node.data.color,
      size: String(node.data.size ?? 200),
    });
  }

  function closeNodeEditModal() {
    setEditingNodeId(null);
    setNodeDraft({ label: "", category: "", description: "", tags: "", color: "#f5f3ff", size: "200" });
  }

  function saveNodeDraft() {
    if (!editingNodeId) return;

    const tags = nodeDraft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setNodes((current) =>
      current.map((node) =>
        node.id === editingNodeId
          ? { ...node, data: { ...node.data, label: nodeDraft.label.trim(), category: nodeDraft.category.trim() || "concept", description: nodeDraft.description.trim(), tags, color: nodeDraft.color, size: Math.max(120, Math.min(360, Number(nodeDraft.size) || 200)) } }
          : node,
      ),
    );
    closeNodeEditModal();
  }

  function deleteEditingNode() {
    if (!editingNodeId) return;

    setSelectedNodeId(editingNodeId);
    setSelectedEdgeId(null);
    if (removeSelected()) {
      closeNodeEditModal();
    }
  }

  useEffect(() => {
    async function loadRemoteData() {
      try {
        const response = await fetch("/api/keyword-map", { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as {
            data?: { documents?: SavedMindmapDocument[] };
            remoteEnabled?: boolean;
            sha?: string | null;
          };

          if (payload.data?.documents?.length) {
            setDocuments(payload.data.documents);
            applyDocument(payload.data.documents[payload.data.documents.length - 1]);
            return;
          }
        }
      } catch {
        // fallback to local cache below
      }

      const savedDocuments = window.localStorage.getItem(documentsStorageKey);
      const legacySave = window.localStorage.getItem(storageKey);

      try {
        if (savedDocuments) {
          const parsedDocuments = JSON.parse(savedDocuments) as SavedMindmapDocument[];
          if (Array.isArray(parsedDocuments) && parsedDocuments.length > 0) {
            setDocuments(parsedDocuments);
            applyDocument(parsedDocuments[parsedDocuments.length - 1]);
            return;
          }
        }

        if (legacySave) {
          const parsed = JSON.parse(legacySave) as { nodes?: KeywordNode[]; edges?: KeywordEdge[] };
          const migrated = makeBlankDocument("문서 1", parsed.nodes ?? initialNodes, parsed.edges ?? initialEdges);
          setDocuments([migrated]);
          applyDocument(migrated);
          return;
        }

        const firstDocument = makeBlankDocument("문서 1");
        setDocuments([firstDocument]);
        applyDocument(firstDocument);
      } catch {
        const firstDocument = makeBlankDocument("문서 1");
        setDocuments([firstDocument]);
        applyDocument(firstDocument);
      }
    }

    void loadRemoteData();
  }, []);

  useEffect(() => {
    if (!documents.length) return;
    window.localStorage.setItem(documentsStorageKey, JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ nodes, edges }));
  }, [edges, nodes]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const newEdge = {
      id: `edge-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      label: "새 연결의 의미를 적어보세요.",
      animated: true,
      type: "smoothstep",
      style: { stroke: "#7c3aed" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
    };

    setEdges((current) => [...current, newEdge]);
    setSelectedEdgeId(newEdge.id);
    setSelectedNodeId(null);
  };

  function addKeywordAtPosition(position?: { x: number; y: number }) {
    const nextIndex = nodes.length + 1;
    const nextNode: KeywordNode = {
      id: `keyword-${Date.now()}`,
      type: "keywordNode",
      position: {
        x: position?.x ?? 200 + (nextIndex % 3) * 170,
        y: position?.y ?? 140 + (nextIndex % 4) * 120,
      },
      data: {
        label: `새 키워드 ${nextIndex}`,
        description: "이 키워드의 의미와 연결 포인트를 적어보세요.",
        color: colorPalette[nextIndex % colorPalette.length],
      },
    };

    setNodes((current) => [...current, nextNode]);
    setSelectedNodeId(nextNode.id);
    setSelectedEdgeId(null);
  }

  function addKeyword() {
    addKeywordAtPosition();
  }

  function handleNodeFieldChange(field: "label" | "description", value: string) {
    if (!selectedNodeId) return;

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                [field]: value,
              },
            }
          : node,
      ),
    );
  }

  function handleEdgeFieldChange(value: string) {
    if (!selectedEdgeId) return;

    setEdges((current) =>
      current.map((edge) =>
        edge.id === selectedEdgeId
          ? {
              ...edge,
              label: value,
            }
          : edge,
      ),
    );
  }

  async function refreshFromGithub() {
    setSaveMessage("GitHub 내용 불러오는 중...");

    try {
      const response = await fetch("/api/keyword-map", { cache: "no-store" });
      if (!response.ok) throw new Error("GitHub 내용을 불러오지 못했습니다.");

      const payload = (await response.json()) as {
        data?: { documents?: SavedMindmapDocument[] };
        remoteEnabled?: boolean;
        sha?: string | null;
      };
      const remoteDocuments = payload.data?.documents ?? [];
      if (remoteDocuments.length) {
        setDocuments(remoteDocuments);
        applyDocument(remoteDocuments[remoteDocuments.length - 1]);
      }
      setRemoteEnabled(Boolean(payload.remoteEnabled));
      setRemoteSha(payload.sha ?? null);
      setSaveMessage(payload.remoteEnabled ? "GitHub 내용이 갱신되었습니다." : "GitHub 동기화가 비활성 상태입니다.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "GitHub 내용을 불러오지 못했습니다.");
    }
  }

  async function saveToGithub(nextDocumentsOverride?: SavedMindmapDocument[]) {
    const nextDocuments = nextDocumentsOverride ?? documents;
    setSaveState("saving");
    setSaveMessage(remoteEnabled ? "저장 중..." : "GitHub 동기화 환경을 확인하는 중입니다.");

    try {
      const response = await fetch("/api/keyword-map", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documents: nextDocuments, sha: remoteSha }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "GitHub 저장에 실패했습니다.");
      }

      const payload = (await response.json()) as { ok: true; sha: string };
      const refreshed = await fetch("/api/keyword-map", { cache: "no-store" });
      const refreshedPayload = refreshed.ok
        ? ((await refreshed.json()) as {
            data?: { documents?: SavedMindmapDocument[] };
            remoteEnabled?: boolean;
            sha?: string | null;
          })
        : null;

      if (refreshedPayload?.data?.documents) {
        setDocuments(refreshedPayload.data.documents);
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

  async function saveCurrentDocument() {
    const trimmedTitle = documentTitle.trim() || `문서 ${documents.length + 1}`;

    const nextDocuments = documents.some((document) => document.id === selectedDocumentId)
      ? documents.map((document) =>
          document.id === selectedDocumentId
            ? {
                ...document,
                title: trimmedTitle,
                updatedAt: new Date().toISOString(),
                nodes,
                edges,
              }
            : document,
        )
      : [
          ...documents,
          {
            id: selectedDocumentId || crypto.randomUUID(),
            title: trimmedTitle,
            updatedAt: new Date().toISOString(),
            nodes,
            edges,
          },
        ];

    const nextSelectedId = selectedDocumentId || nextDocuments[nextDocuments.length - 1].id;
    setSelectedDocumentId(nextSelectedId);
    setDocumentTitle(trimmedTitle);
    setDocuments(nextDocuments);
    await saveToGithub(nextDocuments);
  }

  function openNewDocumentModal() {
    setNewDocumentTitle("");
    setIsNewDocumentModalOpen(true);
  }

  function createNewDocument() {
    const trimmedTitle = newDocumentTitle.trim();
    const nextIndex = documents.length + 1;
    const documentName = trimmedTitle || `문서 ${nextIndex}`;
    const blankMap = {
      nodes: [
        {
          id: `new-root-${Date.now()}`,
          type: "keywordNode",
          position: { x: 220, y: 200 },
          data: {
            label: `새 시작 키워드 ${nextIndex}`,
            description: "여기에 핵심 키워드를 적고 다른 키워드와 연결해 보세요.",
            color: "#f5f3ff",
          },
        },
      ],
      edges: [],
    } satisfies { nodes: KeywordNode[]; edges: KeywordEdge[] };

    const nextDocument = makeBlankDocument(documentName, blankMap.nodes, blankMap.edges);
    setDocuments((current) => [...current, nextDocument]);
    setDocumentTitle(documentName);
    setNewDocumentTitle("");
    setIsNewDocumentModalOpen(false);
    applyDocument(nextDocument);
  }

  function editDocument(documentId: string) {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;

    setSelectedDocumentId(target.id);
    setDocumentTitle(target.title);
    applyDocument(target);
  }

  function loadDocument(documentId: string) {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;
    applyDocument(target);
  }

  function deleteDocumentEntry(documentId: string) {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;

    const hasConfirmed = window.confirm(`"${target.title}"을(를) 삭제하시겠습니까?`);
    if (!hasConfirmed) return;

    const nextDocuments = documents.filter((document) => document.id !== documentId);
    if (nextDocuments.length === 0) {
      const freshDocument = makeBlankDocument("문서 1");
      setDocuments([freshDocument]);
      applyDocument(freshDocument);
      window.alert("삭제 완료되었습니다.");
      return;
    }

    const nextTarget = nextDocuments[nextDocuments.length - 1];
    setDocuments(nextDocuments);
    applyDocument(nextTarget);
    window.alert("삭제 완료되었습니다.");
  }

  function removeSelected() {
    const hasConfirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!hasConfirmed) return false;

    if (selectedNodeId) {
      setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
      setEdges((current) =>
        current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
      );
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      window.alert("삭제 완료되었습니다.");
      return true;
    }

    if (selectedEdgeId) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      window.alert("삭제 완료되었습니다.");
      return true;
    }

    return false;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-3 pb-24 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-4">
        <div className="mb-3 rounded-[18px] border border-violet-100 bg-violet-50/70 px-3 py-2">
          <div className="mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-500">Keyword Map</p>
            <h2 className="mt-1 text-base font-semibold tracking-[-0.03em] text-slate-900">핵심 키워드 연결지도</h2>
          </div>

          <div className="rounded-[14px] bg-transparent p-0">
            <CustomSelect
              value={selectedDocumentId}
              onChange={(nextValue) => {
                if (nextValue === "__new__") {
                  openNewDocumentModal();
                  return;
                }

                loadDocument(nextValue);
              }}
              onEditOption={(nextValue) => {
                if (nextValue === "__new__") {
                  return;
                }

                editDocument(nextValue);
              }}
              onDeleteOption={(nextValue) => {
                if (nextValue === "__new__") {
                  return;
                }

                deleteDocumentEntry(nextValue);
              }}
              placeholder="문서 선택"
              className="w-full"
              menuClassName="max-h-[280px]"
              options={[
                { value: "__new__", label: "새 문서 추가" },
                ...documents.map((document) => ({
                  value: document.id,
                  label: document.title,
                })),
              ]}
            />
          </div>
        </div>

        <div className="h-[640px] w-full overflow-hidden rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.12),_transparent_35%),linear-gradient(180deg,_#fff_0%,_#f8fafc_100%)]">
          <ReactFlowProvider>
            <KeywordMindmapFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={(_, node) => {
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onNodeDoubleClick={openNodeEditModal}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedNodeId(null);
              }}
              addKeywordAtPosition={addKeywordAtPosition}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {isNewDocumentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-3 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-500">new document</p>
                <h3 className="text-lg font-semibold text-slate-900">새 문서 만들기</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDocumentModalOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">문서 이름</label>
              <input
                value={newDocumentTitle}
                onChange={(event) => setNewDocumentTitle(event.target.value)}
                placeholder="예: 중반부의 감정선"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewDocumentModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={createNewDocument}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  만들기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingNodeId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-3 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-500">keyword editor</p>
                <h3 className="text-lg font-semibold text-slate-900">키워드 수정</h3>
              </div>
              <button type="button" onClick={closeNodeEditModal} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                닫기
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <input
                value={nodeDraft.label}
                onChange={(event) => setNodeDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="키워드"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
              <input
                value={nodeDraft.category}
                onChange={(event) => setNodeDraft((current) => ({ ...current, category: event.target.value }))}
                placeholder="카드 상단 라벨"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
              <textarea
                value={nodeDraft.description}
                onChange={(event) => setNodeDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="키워드 설명"
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
              <input
                value={nodeDraft.tags}
                onChange={(event) => setNodeDraft((current) => ({ ...current, tags: event.target.value }))}
                placeholder="태그를 쉼표로 구분"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
              <input
                type="color"
                value={nodeDraft.color}
                onChange={(event) => setNodeDraft((current) => ({ ...current, color: event.target.value }))}
                className="h-11 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-1"
                aria-label="키워드 카드 색상"
              />
              <input
                type="number"
                min="120"
                max="360"
                value={nodeDraft.size}
                onChange={(event) => setNodeDraft((current) => ({ ...current, size: event.target.value }))}
                placeholder="노드 크기"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                aria-label="키워드 노드 크기"
              />
              <div className="flex items-center justify-between gap-2 pt-2">
                <button type="button" onClick={deleteEditingNode} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  삭제
                </button>
                <div className="flex gap-2">
                <button type="button" onClick={closeNodeEditModal} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                  취소
                </button>
                <button type="button" onClick={saveNodeDraft} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  저장
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 pb-28 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Editor</p>
            <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-900">설명 편집</h3>
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
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">키워드</label>
              <input
                value={selectedNode.data.label}
                onChange={(event) => handleNodeFieldChange("label", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">가볍게 설명</label>
              <textarea
                value={selectedNode.data.description}
                onFocus={(event) => {
                  clearDefaultValueIfNeeded(
                    selectedNode.data.description,
                    ["이 키워드의 의미와 연결 포인트를 적어보세요."],
                    (nextValue) => handleNodeFieldChange("description", nextValue),
                    event,
                  );
                }}
                onChange={(event) => handleNodeFieldChange("description", event.target.value)}
                rows={6}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>
        ) : selectedEdge ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">연결 설명</label>
              <textarea
                value={typeof selectedEdge.label === "string" ? selectedEdge.label : String(selectedEdge.label ?? "")}
                onChange={(event) => handleEdgeFieldChange(event.target.value)}
                rows={6}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 text-sm leading-6 text-violet-700">
              연결은 키워드 핸들을 드래그해 만들 수 있습니다. 라벨을 바꾸면 각 관계가 어떤 의미를 갖는지 더 잘 보입니다.
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
            키워드를 클릭해 메모를 편집하거나, 두 키워드 사이를 드래그해 관계를 연결해 보세요. 설명을 적어두면 독서 기록이 훨씬 선명해집니다.
          </div>
        )}
      </aside>

      <FloatingSyncMenu saveMessage={saveMessage} onRefresh={refreshFromGithub} onSave={saveCurrentDocument} />
    </div>
  );
}
