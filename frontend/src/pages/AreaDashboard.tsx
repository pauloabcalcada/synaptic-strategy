import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useAreaDashboard } from "@/hooks/useAreaDashboard";
import { useAreaCommentary } from "@/hooks/useAreaCommentary";
import { useAreas } from "@/hooks/useAreas";
import { useRoleStore } from "@/store/role-store";
import { InfoButton } from "@/components/ui/info-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const areaCommentaryFormSchema = z.object({
  content: z.string(),
});

type AreaCommentaryFormValues = z.infer<typeof areaCommentaryFormSchema>;

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
  const role = useRoleStore((state) => state.role);
  const ownAreaId = useRoleStore((state) => state.areaId);
  const profileLabel = useRoleStore((state) => state.profileLabel);
  const author = profileLabel ?? role ?? "";
  const canBrowseAreas = role !== "manager";
  const { areas } = useAreas(canBrowseAreas);
  const [searchParams] = useSearchParams();
  const requestedAreaId = searchParams.get("id");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const areaId = canBrowseAreas
    ? (selectedAreaId ?? requestedAreaId ?? areas?.[0]?.id ?? null)
    : ownAreaId;
  const { data, loading, error } = useAreaDashboard(areaId ?? "");
  const {
    data: areaCommentary,
    save: saveAreaCommentary,
  } = useAreaCommentary(areaId ?? "", data?.period);

  const areaCommentaryForm = useForm<AreaCommentaryFormValues>({
    resolver: zodResolver(areaCommentaryFormSchema),
    values: { content: areaCommentary?.content ?? "" },
  });

  async function onSubmitAreaCommentary(values: AreaCommentaryFormValues) {
    await saveAreaCommentary(values.content, author);
  }

  const areaPicker = canBrowseAreas && areas && areas.length > 0 && (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Area</span>
      <select
        className="rounded-lg border border-border bg-background px-2 py-1"
        value={areaId ?? ""}
        onChange={(event) => setSelectedAreaId(event.target.value)}
      >
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
    </label>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {areaPicker}
        <div className="text-muted-foreground">Loading area dashboard…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6">
        {areaPicker}
        <div className="text-destructive">
          Couldn't load the area dashboard. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {areaPicker}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 rounded-lg bg-card px-4 py-2 font-mono text-2xl">
          {data.score}
          <InfoButton textKey="scoreFormula" />
        </span>
        <span className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-lg font-semibold text-primary-foreground">
          {data.grade}
          <InfoButton textKey="gradeBrackets" />
        </span>
        {data.score_mom_delta !== null && (
          <span className="flex items-center gap-1 font-mono text-sm text-muted-foreground">
            {data.score_mom_delta >= 0 ? "+" : ""}
            {data.score_mom_delta.toFixed(1)} MoM
            <InfoButton textKey="momTrend" />
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
            <th className="pb-2">Variance</th>
            <th className="pb-2">
              <span className="flex items-center gap-1">
                Status
                <InfoButton textKey="statusThresholds" />
              </span>
            </th>
            <th className="pb-2">MoM</th>
            <th className="pb-2">
              <span className="flex items-center gap-1">
                Trend
                <InfoButton textKey="chartReadingGuide" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.kpis.map((kpi) => (
            <tr key={kpi.code} className="border-t border-border">
              <td className="py-2">
                <Link
                  to={`/indicator?code=${kpi.code}&areaId=${areaId}`}
                  className="hover:text-primary hover:underline"
                >
                  {kpi.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {Math.round(kpi.weight * 100)}% weight
                </div>
              </td>
              <td className="py-2 font-mono">
                {kpi.result} {kpi.unit}
              </td>
              <td className="py-2 font-mono">
                {kpi.target} {kpi.unit}
              </td>
              <td className="py-2 font-mono">{kpi.kpi_score}</td>
              <td className="py-2 font-mono">
                {kpi.variance >= 0 ? "+" : ""}
                {kpi.variance.toFixed(1)}
              </td>
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

      <form
        className="flex flex-col gap-2"
        onSubmit={areaCommentaryForm.handleSubmit(onSubmitAreaCommentary)}
      >
        <div className="flex items-center gap-1">
          <label htmlFor="area-commentary-content" className="text-sm text-muted-foreground">
            Monthly Commentary
          </label>
          <InfoButton textKey="areaCommentaryPanel" />
        </div>
        <textarea
          id="area-commentary-content"
          className="min-h-24 rounded-lg border border-border bg-background p-2 text-sm"
          {...areaCommentaryForm.register("content")}
        />
        <Button
          type="submit"
          className="self-start"
          disabled={areaCommentaryForm.formState.isSubmitting}
        >
          Save commentary
        </Button>
      </form>
    </div>
  );
}
