import { useMemo, useState } from "react";
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
  type NodeMouseHandler,
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

const EDGE_RELATIONSHIP_STYLES: Record<string, { stroke: string; strokeDasharray?: string }> = {
  enables: { stroke: "var(--chart-3)", strokeDasharray: "2 4" },
  drives: { stroke: "var(--chart-2)" },
  impacts: { stroke: "var(--chart-4)", strokeDasharray: "8 4" },
};
const DEFAULT_EDGE_STYLE = { stroke: "var(--muted-foreground)" };

const BASE_NODE_WIDTH = 160;
const BASE_NODE_HEIGHT = 52;
const NODE_WIDTH_PER_WEIGHT = 100;
const NODE_HEIGHT_PER_WEIGHT = 30;

const GROUP_PADDING_X = 32;
const GROUP_PADDING_TOP = 48;
const GROUP_PADDING_BOTTOM = 24;

function nodeDimensions(weight: number) {
  return {
    width: BASE_NODE_WIDTH + weight * NODE_WIDTH_PER_WEIGHT,
    height: BASE_NODE_HEIGHT + weight * NODE_HEIGHT_PER_WEIGHT,
  };
}

interface HoverState {
  node: StrategyGraphNode;
  x: number;
  y: number;
}

function asKpiNodeData(data: NodeProps["data"]): StrategyGraphNode {
  return data as unknown as StrategyGraphNode;
}

function KpiNode({ data }: NodeProps) {
  const node = asKpiNodeData(data);
  const { width, height } = nodeDimensions(node.weight);

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: DEPARTMENT_COLORS[node.department] ?? DEFAULT_DEPARTMENT_COLOR,
        borderColor: GRADE_BORDER_COLORS[node.grade] ?? DEFAULT_GRADE_COLOR,
      }}
      className="relative flex h-full w-full flex-col items-center justify-center rounded-lg border-4 px-2 text-center text-xs font-medium text-background"
    >
      <Handle type="target" position={Position.Left} />
      {node.active_diagnostic && (
        <span
          role="img"
          aria-label="Active AI diagnostic"
          title="Active AI diagnostic"
          className="absolute -top-2 -right-2 text-base leading-none"
        >
          ⚠️
        </span>
      )}
      {node.label}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function DepartmentGroupNode({ data }: NodeProps) {
  const { department, width, height } = data as unknown as {
    department: string;
    width: number;
    height: number;
  };
  const color = DEPARTMENT_COLORS[department] ?? DEFAULT_DEPARTMENT_COLOR;

  return (
    <div
      style={{ width, height, borderColor: color }}
      className="pointer-events-none relative h-full w-full rounded-xl border-2 border-dashed"
    >
      <span
        style={{ color, borderColor: color }}
        className="absolute -top-3 left-3 rounded-full border bg-background px-2 py-0.5 text-xs font-semibold"
      >
        {department}
      </span>
    </div>
  );
}

const NODE_TYPES = { kpiNode: KpiNode, departmentGroup: DepartmentGroupNode };

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

  const kpiFlowNodes: Node[] = nodes.map((node) => {
    const { width, height } = nodeDimensions(node.weight);
    const position = graph.node(node.id);
    return {
      id: node.id,
      type: "kpiNode",
      data: { ...node },
      position: { x: position.x - width / 2, y: position.y - height / 2 },
    };
  });

  const groupsByDepartment = new Map<
    string,
    { minX: number; minY: number; maxX: number; maxY: number }
  >();
  for (const flowNode of kpiFlowNodes) {
    const { department, weight } = asKpiNodeData(flowNode.data);
    const { width, height } = nodeDimensions(weight);
    const bounds = groupsByDepartment.get(department);
    const minX = flowNode.position.x;
    const minY = flowNode.position.y;
    const maxX = flowNode.position.x + width;
    const maxY = flowNode.position.y + height;
    if (!bounds) {
      groupsByDepartment.set(department, { minX, minY, maxX, maxY });
    } else {
      bounds.minX = Math.min(bounds.minX, minX);
      bounds.minY = Math.min(bounds.minY, minY);
      bounds.maxX = Math.max(bounds.maxX, maxX);
      bounds.maxY = Math.max(bounds.maxY, maxY);
    }
  }

  const groupFlowNodes: Node[] = Array.from(groupsByDepartment.entries()).map(
    ([department, bounds]) => ({
      id: `group-${department}`,
      type: "departmentGroup",
      data: {
        department,
        width: bounds.maxX - bounds.minX + GROUP_PADDING_X * 2,
        height: bounds.maxY - bounds.minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM,
      },
      position: { x: bounds.minX - GROUP_PADDING_X, y: bounds.minY - GROUP_PADDING_TOP },
      draggable: false,
      selectable: false,
      zIndex: -1,
    })
  );

  const flowEdges: Edge[] = edges.map((edge, index) => {
    const style = EDGE_RELATIONSHIP_STYLES[edge.label] ?? DEFAULT_EDGE_STYLE;
    return {
      id: `${edge.source}->${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      style,
      markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
    };
  });

  return { flowNodes: [...groupFlowNodes, ...kpiFlowNodes], flowEdges };
}

function NodeHoverCard({ node, x, y }: HoverState) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-56 rounded-lg border border-border bg-card p-3 text-xs shadow-lg"
      style={{ left: x + 16, top: y + 16 }}
    >
      <p className="mb-1.5 font-medium text-foreground">{node.label}</p>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
        <dt>Score</dt>
        <dd className="text-right text-foreground">{node.score}</dd>
        <dt>Result</dt>
        <dd className="text-right text-foreground">{node.result}</dd>
        <dt>Target</dt>
        <dd className="text-right text-foreground">{node.target}</dd>
      </dl>
    </div>
  );
}

export function StrategyGraph() {
  const { data, loading, error } = useStrategyGraph();
  const navigate = useNavigate();
  const [hover, setHover] = useState<HoverState | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!data) {
      return { flowNodes: [], flowEdges: [] };
    }
    return layoutGraph(data.nodes, data.edges);
  }, [data]);

  const handleNodeHover: NodeMouseHandler = (event, node) => {
    if (node.type !== "kpiNode") return;
    setHover({ node: asKpiNodeData(node.data), x: event.clientX, y: event.clientY });
  };

  const handleNodeMouseLeave: NodeMouseHandler = () => {
    setHover(null);
  };

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
      <div className="relative h-[70vh] w-full rounded-lg border border-border">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_event, node) => {
            if (node.type === "kpiNode") navigate(`/indicator?code=${node.id}`);
          }}
          onNodeMouseEnter={handleNodeHover}
          onNodeMouseMove={handleNodeHover}
          onNodeMouseLeave={handleNodeMouseLeave}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        {hover && <NodeHoverCard {...hover} />}
      </div>
    </div>
  );
}
