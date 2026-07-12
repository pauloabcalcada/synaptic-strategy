import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  useExecutiveOverview,
  type ExecutiveOverviewArea,
  type ExecutiveOverviewHeatmapRow,
} from "@/hooks/useExecutiveOverview";
import { InfoButton } from "@/components/ui/info-button";
import { cn } from "@/lib/utils";

const GRADE_STYLES: Record<string, string> = {
  A: "bg-success text-primary-foreground",
  B: "bg-primary text-primary-foreground",
  C: "bg-warning text-primary-foreground",
  D: "bg-destructive text-primary-foreground",
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-0.5 text-sm font-semibold",
        GRADE_STYLES[grade] ?? "bg-muted text-muted-foreground"
      )}
    >
      {grade}
    </span>
  );
}

function AreaScoreCard({ area }: { area: ExecutiveOverviewArea }) {
  return (
    <Link
      to={`/area?id=${area.area_id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 no-underline transition-colors hover:border-primary"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{area.name}</span>
        <GradeBadge grade={area.grade} />
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl text-foreground">{area.score}</span>
        {area.score_mom_delta !== null && (
          <span className="font-mono text-sm text-muted-foreground">
            {area.score_mom_delta >= 0 ? "+" : ""}
            {area.score_mom_delta.toFixed(1)} MoM
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{area.pillar}</span>
    </Link>
  );
}

const HEATMAP_DEFAULT_PERIOD_COUNT = 6;

function Heatmap({ rows }: { rows: ExecutiveOverviewHeatmapRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const allPeriods = Array.from(
    new Set(rows.flatMap((row) => row.cells.map((cell) => cell.period)))
  ).sort();
  const hasHiddenHistory = allPeriods.length > HEATMAP_DEFAULT_PERIOD_COUNT;
  const periods = expanded
    ? allPeriods
    : allPeriods.slice(-HEATMAP_DEFAULT_PERIOD_COUNT);

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full overflow-x-auto">
        <table className={cn("text-left text-sm", !expanded && "w-full")}>
          <thead className="text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-10 bg-background pb-2 pr-4">Area</th>
              {periods.map((period) => (
                <th key={period} className="pb-2 px-1 font-mono text-xs font-normal">
                  {period.slice(0, 7)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cellsByPeriod = new Map(row.cells.map((cell) => [cell.period, cell]));
              return (
                <tr key={row.area_id} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-background py-1 pr-4">{row.name}</td>
                  {periods.map((period) => {
                    const cell = cellsByPeriod.get(period);
                    return (
                      <td key={period} className="px-1 py-1">
                        <div
                          className={cn(
                            "flex min-w-16 items-center justify-center rounded-md py-3 font-mono text-sm font-bold",
                            cell ? (GRADE_STYLES[cell.grade] ?? "bg-muted") : "bg-transparent"
                          )}
                          title={cell ? `${cell.period}: ${cell.grade} (${cell.score})` : "No data"}
                        >
                          {cell ? cell.score : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasHiddenHistory && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="self-start px-0"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show recent 6 periods" : "Show full history"}
        </Button>
      )}
    </div>
  );
}

export function Executive() {
  const { data, loading, error } = useExecutiveOverview();

  if (loading) {
    return <div className="text-muted-foreground">Loading executive overview…</div>;
  }

  if (error || !data) {
    return (
      <div className="text-destructive">
        Couldn't load the executive overview. Please try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-semibold text-foreground">Areas</h2>
          <InfoButton textKey="executiveScoreAggregation" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {data.areas.map((area) => (
            <AreaScoreCard key={area.area_id} area={area} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-semibold text-foreground">Area performance heatmap</h2>
          <InfoButton textKey="executiveHeatmapLegend" />
        </div>
        <Heatmap rows={data.heatmap} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-semibold text-foreground">Strategic pillars</h2>
          <InfoButton textKey="executivePillarGrouping" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.pillars.map((pillar) => (
            <div
              key={pillar.name}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{pillar.name}</span>
                <GradeBadge grade={pillar.rollup_grade} />
              </div>
              <span className="font-mono text-xl text-foreground">
                {pillar.rollup_score.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                {pillar.areas.join(", ")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Link
          to="/graph"
          className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 no-underline transition-colors hover:border-primary"
        >
          <span className="font-medium text-foreground">Strategy Graph</span>
          <span className="text-sm text-muted-foreground">
            Explore how KPIs across areas relate to one another.
          </span>
        </Link>
      </section>
    </div>
  );
}
