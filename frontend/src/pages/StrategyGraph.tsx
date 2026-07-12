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

const GRADE_FILL_INTENSITY: Record<string, number> = {
  A: 90,
  B: 65,
  C: 40,
  D: 20,
};
const DEFAULT_GRADE_FILL_INTENSITY = 50;

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

const COLUMN_GAP = 120;
const ROW_GAP = 40;
const COLUMN_HEADER_HEIGHT = 56;

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
  const departmentColor = DEPARTMENT_COLORS[node.department] ?? DEFAULT_DEPARTMENT_COLOR;
  const fillIntensity = GRADE_FILL_INTENSITY[node.grade] ?? DEFAULT_GRADE_FILL_INTENSITY;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: `color-mix(in srgb, ${departmentColor} ${fillIntensity}%, var(--background))`,
        borderColor: departmentColor,
      }}
      className="relative flex h-full w-full flex-col items-center justify-center rounded-lg border-4 px-2 text-center text-xs font-medium text-foreground"
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

function DepartmentColumnHeader({ data }: NodeProps) {
  const { department, width } = data as unknown as { department: string; width: number };
  const color = DEPARTMENT_COLORS[department] ?? DEFAULT_DEPARTMENT_COLOR;

  return (
    <div
      style={{ width, height: COLUMN_HEADER_HEIGHT - 16, color, borderColor: color }}
      className="pointer-events-none flex items-end justify-center border-b-2 pb-2 text-sm font-semibold"
    >
      {department}
    </div>
  );
}

const NODE_TYPES = { kpiNode: KpiNode, departmentColumnHeader: DepartmentColumnHeader };

function layoutGraph(
  nodes: StrategyGraphNode[],
  edges: { source: string; target: string; label: string }[]
): { flowNodes: Node[]; flowEdges: Edge[] } {
  // Rank nodes causally (upstream -> downstream) so each department column still
  // reads top-to-bottom in roughly cause-then-effect order.
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 100 });
  graph.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) {
    graph.setNode(node.id, nodeDimensions(node.weight));
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }
  dagre.layout(graph);
  const causalRank = new Map(nodes.map((node) => [node.id, graph.node(node.id).x]));

  const departmentOrder = [
    ...Object.keys(DEPARTMENT_COLORS).filter((department) =>
      nodes.some((node) => node.department === department)
    ),
    ...Array.from(new Set(nodes.map((node) => node.department))).filter(
      (department) => !(department in DEPARTMENT_COLORS)
    ),
  ];

  const nodesByDepartment = new Map<string, StrategyGraphNode[]>(
    departmentOrder.map((department) => [department, []])
  );
  for (const node of nodes) {
    nodesByDepartment.get(node.department)?.push(node);
  }
  for (const departmentNodes of nodesByDepartment.values()) {
    departmentNodes.sort(
      (a, b) => (causalRank.get(a.id) ?? 0) - (causalRank.get(b.id) ?? 0)
    );
  }

  const columnWidths = new Map(
    departmentOrder.map((department) => [
      department,
      Math.max(
        BASE_NODE_WIDTH,
        ...nodesByDepartment.get(department)!.map((node) => nodeDimensions(node.weight).width)
      ),
    ])
  );

  const columnX = new Map<string, number>();
  let x = 0;
  for (const department of departmentOrder) {
    columnX.set(department, x);
    x += columnWidths.get(department)! + COLUMN_GAP;
  }

  const kpiFlowNodes: Node[] = [];
  const headerFlowNodes: Node[] = [];
  for (const department of departmentOrder) {
    const colX = columnX.get(department)!;
    const colWidth = columnWidths.get(department)!;
    headerFlowNodes.push({
      id: `column-header-${department}`,
      type: "departmentColumnHeader",
      data: { department, width: colWidth },
      position: { x: colX, y: 0 },
      draggable: false,
      selectable: false,
    });

    let y = COLUMN_HEADER_HEIGHT;
    for (const node of nodesByDepartment.get(department)!) {
      const { width, height } = nodeDimensions(node.weight);
      kpiFlowNodes.push({
        id: node.id,
        type: "kpiNode",
        data: { ...node },
        position: { x: colX + (colWidth - width) / 2, y },
      });
      y += height + ROW_GAP;
    }
  }

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

  return { flowNodes: [...headerFlowNodes, ...kpiFlowNodes], flowEdges };
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
