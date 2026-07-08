import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useStrategyGraph, type StrategyGraphNode } from "@/hooks/useStrategyGraph";
import { InfoButton } from "@/components/ui/info-button";

const DEPARTMENT_COLORS: Record<string, string> = {
  Finance: "var(--chart-1)",
  Sales: "var(--chart-2)",
  People: "var(--chart-3)",
  Governance: "var(--chart-4)",
  Technology: "var(--chart-5)",
};
const DEFAULT_DEPARTMENT_COLOR = "var(--muted-foreground)";

const GRADE_BORDER_COLORS: Record<string, string> = {
  A: "var(--success)",
  B: "var(--primary)",
  C: "var(--warning)",
  D: "var(--destructive)",
};
const DEFAULT_GRADE_COLOR = "var(--border-strong)";

const BASE_NODE_WIDTH = 160;
const BASE_NODE_HEIGHT = 52;
const NODE_WIDTH_PER_WEIGHT = 100;
const NODE_HEIGHT_PER_WEIGHT = 30;

function nodeDimensions(weight: number) {
  return {
    width: BASE_NODE_WIDTH + weight * NODE_WIDTH_PER_WEIGHT,
    height: BASE_NODE_HEIGHT + weight * NODE_HEIGHT_PER_WEIGHT,
  };
}

function KpiNode({ data }: NodeProps) {
  const node = data as unknown as StrategyGraphNode;
  const { width, height } = nodeDimensions(node.weight);

  return (
    <div
      title={`Score ${node.score} · Result ${node.result} · Target ${node.target}`}
      style={{
        width,
        height,
        backgroundColor: DEPARTMENT_COLORS[node.department] ?? DEFAULT_DEPARTMENT_COLOR,
        borderColor: GRADE_BORDER_COLORS[node.grade] ?? DEFAULT_GRADE_COLOR,
      }}
      className="flex h-full w-full flex-col items-center justify-center rounded-lg border-4 px-2 text-center text-xs font-medium text-background"
    >
      <Handle type="target" position={Position.Left} />
      {node.label}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { kpiNode: KpiNode };

function layoutGraph(
  nodes: StrategyGraphNode[],
  edges: { source: string; target: string; label: string }[]
): { flowNodes: Node[]; flowEdges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 100 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const { width, height } = nodeDimensions(node.weight);
    graph.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const flowNodes: Node[] = nodes.map((node) => {
    const { width, height } = nodeDimensions(node.weight);
    const position = graph.node(node.id);
    return {
      id: node.id,
      type: "kpiNode",
      data: { ...node },
      position: { x: position.x - width / 2, y: position.y - height / 2 },
    };
  });

  const flowEdges: Edge[] = edges.map((edge, index) => ({
    id: `${edge.source}->${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  return { flowNodes, flowEdges };
}

export function StrategyGraph() {
  const { data, loading, error } = useStrategyGraph();
  const navigate = useNavigate();

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!data) {
      return { flowNodes: [], flowEdges: [] };
    }
    return layoutGraph(data.nodes, data.edges);
  }, [data]);

  if (loading) {
    return <div className="text-muted-foreground">Loading strategy graph…</div>;
  }

  if (error || !data) {
    return (
      <div className="text-destructive">
        Couldn't load the strategy graph. Please try again.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Strategy Relationship Graph</h1>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          Edge direction
          <InfoButton textKey="graphEdgeDirection" />
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          Node encoding
          <InfoButton textKey="graphNodeEncoding" />
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          Relationship labels
          <InfoButton textKey="graphRelationshipLabels" />
        </span>
      </div>
      <div className="h-[70vh] w-full rounded-lg border border-border">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_event, node) => navigate(`/indicator?code=${node.id}`)}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
