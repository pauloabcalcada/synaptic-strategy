import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useAreaDashboard } from "@/hooks/useAreaDashboard";
import { useRoleStore } from "@/store/role-store";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  on_track: "text-success",
  at_risk: "text-warning",
  off_track: "text-destructive",
};

function Sparkline({ values }: { values: number[] }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaDashboard() {
  const areaId = useRoleStore((state) => state.areaId);
  const { data, loading, error } = useAreaDashboard(areaId ?? "");

  if (loading) {
    return <div className="text-muted-foreground">Loading area dashboard…</div>;
  }

  if (error || !data) {
    return (
      <div className="text-destructive">
        Couldn't load the area dashboard. Please try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="rounded-lg bg-card px-4 py-2 font-mono text-2xl">
          {data.score}
        </span>
        <span className="rounded-lg bg-primary px-3 py-1 text-lg font-semibold text-primary-foreground">
          {data.grade}
        </span>
        {data.score_mom_delta !== null && (
          <span className="font-mono text-sm text-muted-foreground">
            {data.score_mom_delta >= 0 ? "+" : ""}
            {data.score_mom_delta.toFixed(1)} MoM
          </span>
        )}
      </div>

      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="pb-2">KPI</th>
            <th className="pb-2">Result</th>
            <th className="pb-2">Target</th>
            <th className="pb-2">Score</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">MoM</th>
            <th className="pb-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.kpis.map((kpi) => (
            <tr key={kpi.code} className="border-t border-border">
              <td className="py-2">
                <Link
                  to={`/indicator?code=${kpi.code}`}
                  className="hover:text-primary hover:underline"
                >
                  {kpi.name}
                </Link>
              </td>
              <td className="py-2 font-mono">
                {kpi.result} {kpi.unit}
              </td>
              <td className="py-2 font-mono">
                {kpi.target} {kpi.unit}
              </td>
              <td className="py-2 font-mono">{kpi.kpi_score}</td>
              <td className={cn("py-2", STATUS_STYLES[kpi.status])}>
                {kpi.status}
              </td>
              <td className="py-2 font-mono">
                {kpi.mom_trend === null
                  ? "—"
                  : `${kpi.mom_trend >= 0 ? "+" : ""}${kpi.mom_trend.toFixed(1)}`}
              </td>
              <td className="py-2">
                <Sparkline values={kpi.sparkline} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
