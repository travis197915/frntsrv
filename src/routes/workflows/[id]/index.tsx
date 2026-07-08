import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  Panel,
} from "@xyflow/react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Save,
  Loader2,
  Square,
  Pencil,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import {
  workflowsApi,
  type WorkflowDetail,
  type BuildStatus,
} from "@/lib/workflowsApi";
import { useWorkflowCanvas } from "../hooks/useWorkflowCanvas";
import { useWorkflowUiColors } from "../hooks/useWorkflowUiColors";
import { nodeTypes } from "../components/nodes/nodeTypes";
import NodePalette from "../components/NodePalette";
import ConfigPanel from "../components/ConfigPanel";
import WorkflowContextPanel from "../components/WorkflowContextPanel";
import {
  ShapeCatalogProvider,
  useShapeCatalog,
} from "../components/nodes/ShapeCatalogProvider";
import { NODE_TYPE_CONFIG } from "../types";
import { useWorkflowExecution } from "../execution/useWorkflowExecution";
import {
  applyExecutionToNodes,
  applyExecutionToEdges,
} from "../execution/ExecutionOverlay";
import ExecutionOverlay from "../execution/ExecutionOverlay";
import ExecutionPanel from "../execution/ExecutionPanel";
import ExecutionToolbar from "../execution/ExecutionToolbar";
import WorkflowBuilderLoading from "./loading";
import BuildProgress from "./BuildProgress";
import { useAuth } from "@/contexts/AuthContext";

// ── Edge inspector (label + quick Yes/No) ────────────────────────────────────
function EdgeInspector({
  edgeId,
  currentLabel,
  onLabel,
}: {
  edgeId: string;
  currentLabel: string;
  onLabel: (id: string, label: string) => void;
}) {
  const [draft, setDraft] = useState(currentLabel);

  // sync when a different edge is selected
  useEffect(() => {
    setDraft(currentLabel);
  }, [edgeId, currentLabel]);

  const commit = () => onLabel(edgeId, draft.trim());

  return (
    <Panel position="top-right">
      <div
        style={{
          background: "var(--card, #fff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 10,
          padding: "10px 12px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
          minWidth: 200,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted-foreground, #71717a)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Edge label
        </p>

        {/* Quick labels */}
        <div style={{ display: "flex", gap: 6 }}>
          {["Yes", "No"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setDraft(opt);
                onLabel(edgeId, opt);
              }}
              style={{
                flex: 1,
                padding: "4px 0",
                borderRadius: 6,
                border: "1px solid var(--border, #e2e8f0)",
                background:
                  draft === opt
                    ? opt === "Yes"
                      ? "#dcfce7"
                      : "#fee2e2"
                    : "transparent",
                color:
                  draft === opt
                    ? opt === "Yes"
                      ? "#15803d"
                      : "#dc2626"
                    : "var(--foreground, #0f172a)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              {opt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onLabel(edgeId, "");
            }}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid var(--border, #e2e8f0)",
              background: "transparent",
              color: "var(--muted-foreground, #71717a)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>

        {/* Free text */}
        <input
          type="text"
          value={draft}
          placeholder="Custom label…"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setDraft(e.target.value)
          }
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          style={{
            width: "100%",
            padding: "5px 8px",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 6,
            fontSize: 12,
            background: "var(--background, #f8fafc)",
            color: "var(--foreground, #0f172a)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
    </Panel>
  );
}

function WorkflowBuilderInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const ui = useWorkflowUiColors();
  const [isExecutionMode, setIsExecutionMode] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // ── Corebackend: load workflow ─────────────────────────────────────────────
  const isNew = !id || id === "new";
  const [workflowData, setWorkflowData] = useState<{
    workflow: WorkflowDetail;
  } | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const canvasLoadedForId = useRef<string | null>(null);

  // Auto-build: while the canvas is generated from the SOP we show a build
  // screen (with live logs) instead of the empty canvas.
  const [buildState, setBuildState] = useState<BuildStatus | null>(null);
  const [buildChecked, setBuildChecked] = useState(false);

  const refetchWorkflow = useCallback(() => {
    if (isNew || !id) return;
    workflowsApi.get(id).then((wf) => setWorkflowData({ workflow: wf }));
  }, [id, isNew]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    setWorkflowLoading(true);
    workflowsApi
      .get(id)
      .then((wf) => {
        if (!cancelled) setWorkflowData({ workflow: wf });
      })
      .finally(() => {
        if (!cancelled) setWorkflowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // One-shot check on mount: is this an auto-build workflow still being built?
  useEffect(() => {
    if (isNew || !id) {
      setBuildChecked(true);
      return;
    }
    let cancelled = false;
    workflowsApi
      .buildStatus(id)
      .then((s) => {
        if (!cancelled) setBuildState(s);
      })
      .catch(() => {
        /* non-fatal — fall through to the canvas */
      })
      .finally(() => {
        if (!cancelled) setBuildChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const handleBuildComplete = useCallback(() => {
    // Force the canvas effect to reload the freshly-built graph.
    canvasLoadedForId.current = null;
    refetchWorkflow();
    setBuildState((s) => (s ? { ...s, built: true, phase: "done" } : s));
  }, [refetchWorkflow]);

  // Re-poll build status after a new SOP is ingested into an existing
  // workflow so the live progress (SSE) screen re-engages — mirrors the
  // "Create with AI" flow.
  const refreshBuildStatus = useCallback(() => {
    if (!id) return;
    workflowsApi
      .buildStatus(id)
      .then((s) => {
        setBuildState(s);
        setBuildChecked(true);
      })
      .catch(() => {
        /* non-fatal */
      });
  }, [id]);

  const { bySlug: shapeCatalog } = useShapeCatalog();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    onNodeClick,
    onPaneClick,
    selectedNode,
    updateNodeData,
    deleteNode,
    workflowMeta,
    updateWorkflowMeta,
    isDirty,
    isSaving,
    saveError,
    setSaveError,
    saveWorkflow,
    loadFromJSON,
    setSelectedNodeId,
    selectedEdge,
    onEdgeClick,
    labelEdge,
  } = useWorkflowCanvas(id, {
    shapeCatalog,
    onSave: async ({ id: wfId, name, description, nodesJson, edgesJson }) => {
      if (!wfId || wfId === "new") {
        const created = await workflowsApi.create({
          name,
          description,
          isActive: true,
          nodes: nodesJson,
          edges: edgesJson,
        });
        navigate(`/workflows/${created.id}`, { replace: true });
        return { id: created.id };
      }
      await workflowsApi.update(wfId, {
        name,
        description,
        isActive: true,
        nodes: nodesJson,
        edges: edgesJson,
      });
      return { id: wfId };
    },
  });

  const {
    execution,
    cancel,
    reset,
    submitInteraction,
    submitPreflightInput,
    submitSopInput,
  } = useWorkflowExecution();

  useEffect(() => {
    const wf = (workflowData as any)?.workflow;
    if (!wf) return;
    if (canvasLoadedForId.current === wf.id) return;
    canvasLoadedForId.current = wf.id;

    const nodesStr = wf.nodes ?? "[]";
    const edgesStr = wf.edges ?? "[]";
    const configJson = JSON.stringify({
      version: 1,
      nodes: JSON.parse(nodesStr),
      edges: JSON.parse(edgesStr),
    });

    loadFromJSON(configJson, {
      id: wf.id,
      name: wf.name,
      description: wf.description ?? "",
      status: wf.status ?? "idle",
      createdAt: wf.createdAt ?? "",
      updatedAt: wf.updatedAt ?? "",
    });
  }, [workflowData, loadFromJSON]);

  // ── Sync live execution errors to the error banner ────────────────────────
  useEffect(() => {
    if (execution.isLive && execution.error && execution.status === "failed") {
      setExecutionError(execution.error);
    }
  }, [execution.isLive, execution.error, execution.status]);

  // ── Keyboard save ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (canWrite && isDirty && !isSaving && !isExecutionMode) saveWorkflow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canWrite, isDirty, isSaving, saveWorkflow, isExecutionMode]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // ── Execution: live API ────────────────────────────────────────────────────
  const handleStopExecution = useCallback(() => {
    cancel();
    setIsExecutionMode(false);
    setExecutionError(null);
    reset();
  }, [cancel, reset]);

  const handleClosePanel = useCallback(() => {
    if (
      execution.status === "completed" ||
      execution.status === "failed" ||
      execution.status === "cancelled"
    ) {
      setIsExecutionMode(false);
      setExecutionError(null);
      reset();
    }
  }, [execution.status, reset]);

  const displayNodes = useMemo(
    () => (isExecutionMode ? applyExecutionToNodes(nodes, execution) : nodes),
    [nodes, execution, isExecutionMode],
  );

  const displayEdges = useMemo(
    () => (isExecutionMode ? applyExecutionToEdges(edges, execution) : edges),
    [edges, execution, isExecutionMode],
  );

  const executionNodeCount = useMemo(
    () => nodes.filter((n) => n.type !== "workarea").length,
    [nodes],
  );
  const hasWorkArea = useMemo(
    () => nodes.some((n) => n.type === "workarea"),
    [nodes],
  );

  const miniMapNodeColor = useCallback(
    (node: { data?: { nodeType?: string } }) => {
      if (node.data?.nodeType === "workarea") return "rgba(99, 102, 241, 0.12)";
      return ui.mutedForeground;
    },
    [ui.mutedForeground],
  );

  const miniMapNodeStrokeColor = useCallback(
    (node: { data?: { nodeType?: string } }) => {
      if (node.data?.nodeType === "workarea")
        return NODE_TYPE_CONFIG.workarea.color;
      return "transparent";
    },
    [],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "smoothstep" as const,
      markerEnd: {
        type: "arrowclosed" as const,
        color: ui.mutedForeground || "#71717a",
      },
      style: { stroke: ui.mutedForeground || "#71717a", strokeWidth: 2 },
    }),
    [ui.mutedForeground],
  );

  const connectionLineStyle = useMemo(
    () => ({
      stroke: ui.mutedForeground || "var(--muted-foreground)",
      strokeWidth: 2,
    }),
    [ui.mutedForeground],
  );

  const dotColor =
    ui.theme === "dark" ? "oklch(0.35 0.02 30)" : "oklch(0.78 0.02 30)";

  if (!isNew && (workflowLoading || !buildChecked)) {
    return <WorkflowBuilderLoading />;
  }

  // Hold on the build screen (live logs) until the SOP→canvas build finishes,
  // so the user never lands on an empty canvas mid-build.
  const isBuilding =
    !isNew &&
    buildChecked &&
    Boolean(buildState?.auto_build) &&
    buildState?.phase !== "done";

  if (isBuilding && id) {
    return (
      <BuildProgress
        workflowId={id}
        workflowName={workflowData?.workflow?.name}
        initial={buildState}
        onComplete={handleBuildComplete}
        onSkip={() =>
          setBuildState((s) => (s ? { ...s, built: true, phase: "done" } : s))
        }
        onBack={() => navigate("/workflows")}
      />
    );
  }

  const isCanvasLocked = isExecutionMode || !canWrite;

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden text-foreground">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (isExecutionMode) {
                handleStopExecution();
              } else {
                navigate("/workflows");
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex items-center gap-1.5">
            {isEditingName && !isExecutionMode ? (
              <>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={workflowMeta.name}
                  onChange={(e) => updateWorkflowMeta({ name: e.target.value })}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      setIsEditingName(false);
                    }
                  }}
                  className="h-8 w-[260px] rounded-md border border-input bg-background px-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Untitled Workflow"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Done editing workflow name"
                >
                  <Check className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <p
                  className="max-w-[280px] text-sm font-semibold text-foreground truncate"
                  title={workflowMeta.name || "Untitled Workflow"}
                >
                  {workflowMeta.name || "Untitled Workflow"}
                </p>
                {!isExecutionMode && canWrite && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Edit workflow name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>

          <StatusBadge
            status={isExecutionMode ? execution.status : workflowMeta.status}
          />

          {isDirty && !isExecutionMode && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-500/10">
              Unsaved
            </span>
          )}

          {execution.runId && isExecutionMode && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium px-1.5 py-0.5 rounded bg-blue-500/10 font-mono">
              Run #{execution.runId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isExecutionMode ? (
            <div className="flex items-center gap-2">
              {execution.status === "completed" ||
              execution.status === "failed" ||
              execution.status === "cancelled" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopExecution}
                  className="text-muted-foreground"
                >
                  Exit
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopExecution}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Square className="h-3.5 w-3.5 mr-1.5" />
                  Stop Execution
                </Button>
              )}
            </div>
          ) : (
            <>
              <Button
                size="sm"
                onClick={saveWorkflow}
                disabled={!canWrite || !isDirty || isSaving || isNew}
                title={
                  !canWrite
                    ? "Only admins can save workflows"
                    : undefined
                }
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save Workflow
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Save error banner */}
      {saveError && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-xs shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">Save failed: {saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Execution error banner */}
      {executionError && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-xs shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{executionError}</span>
          <button
            type="button"
            onClick={() => setExecutionError(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Main area — flat 3-panel layout so sidebars are fully independent */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 min-h-0 overflow-hidden"
      >
        {/* NodePalette — left sidebar; visible in view mode for auditors */}
        {!isExecutionMode && (
          <>
            <ResizablePanel
              defaultSize={100}
              minSize={250}
              maxSize={350}
              className="flex flex-col overflow-hidden"
            >
              <NodePalette hasWorkArea={hasWorkArea} readOnly={!canWrite} />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Canvas — always present, absorbs all drag from both sides */}
        <ResizablePanel minSize={30} className="flex min-w-0">
          <div className="flex-1 min-w-0 bg-muted/30">
            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              onNodesChange={isCanvasLocked ? undefined : onNodesChange}
              onEdgesChange={isCanvasLocked ? undefined : onEdgesChange}
              onConnect={isCanvasLocked ? undefined : onConnect}
              onDrop={isCanvasLocked ? undefined : onDrop}
              onDragOver={isCanvasLocked ? undefined : onDragOver}
              onNodeClick={isExecutionMode ? undefined : onNodeClick}
              onEdgeClick={isExecutionMode ? undefined : onEdgeClick}
              onPaneClick={isExecutionMode ? undefined : onPaneClick}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              snapToGrid={!isCanvasLocked}
              snapGrid={[20, 20]}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              panOnScroll
              panOnScrollMode={PanOnScrollMode.Free}
              zoomOnScroll={false}
              zoomOnPinch
              connectionLineStyle={connectionLineStyle}
              proOptions={{ hideAttribution: true }}
              className="workflow-canvas"
              nodesDraggable={!isCanvasLocked}
              nodesConnectable={!isCanvasLocked}
              elementsSelectable={!isExecutionMode}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1.5}
                color={dotColor}
              />
              <MiniMap
                nodeColor={miniMapNodeColor}
                nodeStrokeColor={miniMapNodeStrokeColor}
                nodeStrokeWidth={2}
                nodeBorderRadius={4}
                maskColor={ui.minimapMask}
                maskStrokeColor="none"
                style={{ width: 180, height: 130 }}
                className="bg-card/90! backdrop-blur-sm! border-border! border rounded-lg! shadow-md!"
                pannable
                zoomable
              />
              <Controls
                showInteractive={false}
                className="bg-card! border-border! border shadow-sm! [&>button]:bg-background! [&>button]:border-border! [&>button]:text-muted-foreground! [&>button:hover]:bg-muted! [&>button]:fill-muted-foreground!"
              />

              {!isCanvasLocked && selectedEdge && (
                <EdgeInspector
                  edgeId={selectedEdge.id}
                  currentLabel={
                    typeof selectedEdge.label === "string"
                      ? selectedEdge.label
                      : ""
                  }
                  onLabel={labelEdge}
                />
              )}

              {isExecutionMode && (
                <ExecutionOverlay
                  execution={execution}
                  nodes={nodes}
                  onSubmitInteraction={submitInteraction}
                />
              )}
            </ReactFlow>
          </div>
        </ResizablePanel>

        {/* Right panel — always the context panel; ConfigPanel is a floating modal */}
        {(isExecutionMode || (!isNew && id)) && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={100}
              minSize={320}
              maxSize={450}
              className="flex flex-col overflow-hidden"
            >
              {isExecutionMode ? (
                <ExecutionPanel
                  execution={execution}
                  nodes={nodes}
                  onSubmitInteraction={submitInteraction}
                  onSubmitPreflightInput={submitPreflightInput}
                  onSubmitSopInput={submitSopInput}
                  onClose={handleClosePanel}
                />
              ) : !isNew && id ? (
                <WorkflowContextPanel
                  workflowId={id}
                  workflowName={workflowMeta.name}
                  workflowDescription={workflowMeta.description ?? ""}
                  sops={workflowData?.workflow?.sops ?? []}
                  agents={workflowData?.workflow?.agents ?? []}
                  autoBuilt={Boolean(
                    (workflowData?.workflow?.metadata as Record<string, unknown> | undefined)
                      ?.auto_build_canvas,
                  )}
                  onAttached={refetchWorkflow}
                  canWrite={canWrite}
                  onIngestStarted={refreshBuildStatus}
                  onCanvasReload={handleBuildComplete}
                />
              ) : null}
            </ResizablePanel>
          </>
        )}

        {/* Node inspector — floats as a wide modal over the canvas */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            onClose={() => setSelectedNodeId(null)}
            workflowId={isNew ? undefined : id}
            readOnly={!canWrite}
            workflowSops={workflowData?.workflow?.sops ?? []}
            onSave={canWrite && !isNew ? saveWorkflow : undefined}
            isSaving={isSaving}
            isDirty={isDirty}
          />
        )}
      </ResizablePanelGroup>

      {/* Execution: floating toolbar */}
      {isExecutionMode && (
        <ExecutionToolbar
          status={execution.status}
          stepIndex={execution.stepOrder.length}
          totalSteps={executionNodeCount}
          elapsedMs={execution.elapsedMs}
          isLive={execution.isLive}
          currentPhaseName={
            execution.isLive && execution.currentNodeId
              ? (execution.workbenchRuns.find(
                  (r) => r.workbenchId === execution.currentNodeId,
                )?.name ?? undefined)
              : undefined
          }
          onCancel={handleStopExecution}
        />
      )}

      {/* Saving progress — a blunt, blocking overlay so the auditor sees the
          save is in flight (the graph PUT can take several seconds) and can't
          double-submit. Dismisses itself when isSaving flips false. */}
      {isSaving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex w-[320px] flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-7 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Saving workflow…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Persisting nodes, rules and tool bindings. This can take a few
                seconds — please don't close the tab.
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-[wf-indeterminate_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowBuilderPage() {
  return (
    <ShapeCatalogProvider>
      <ReactFlowProvider>
        <WorkflowBuilderInner />
      </ReactFlowProvider>
    </ShapeCatalogProvider>
  );
}
