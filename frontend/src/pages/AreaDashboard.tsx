import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useAreaDashboard } from "@/hooks/useAreaDashboard";
import { useAreaCommentary } from "@/hooks/useAreaCommentary";
import { useAreaAiSummary } from "@/hooks/useAreaAiSummary";
import { useAreas } from "@/hooks/useAreas";
import { useChat } from "@/hooks/useChat";
import { useRoleStore } from "@/store/role-store";
import { InfoButton } from "@/components/ui/info-button";
import { Button } from "@/components/ui/button";
import { AIPanel } from "@/components/ui/ai-panel";
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
  const { data: areaAiSummary } = useAreaAiSummary(areaId ?? "", data?.period);
  const flaggedKpi = areaAiSummary?.summary ?? null;
  const chat = useChat(flaggedKpi?.indicator_code ?? "", role ?? "");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const areaCommentaryForm = useForm<AreaCommentaryFormValues>({
    resolver: zodResolver(areaCommentaryFormSchema),
    values: { content: areaCommentary?.content ?? "" },
  });

  async function onSubmitAreaCommentary(values: AreaCommentaryFormValues) {
    await saveAreaCommentary(values.content, author);
  }

  async function onSubmitChat(event: FormEvent) {
    event.preventDefault();
    if (!chatInput.trim()) {
      return;
    }
    const content = chatInput;
    setChatInput("");
    await chat.send(content);
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

      {chatOpen && flaggedKpi && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border bg-background p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat with {flaggedKpi.indicator_name}</h2>
            <Button type="button" variant="ghost" onClick={() => setChatOpen(false)}>
              Close
            </Button>
          </div>
          <AIPanel>
            <div className="flex flex-col gap-3 text-sm">
              {chat.messages.map((message, index) => (
                <p
                  key={index}
                  className={cn(
                    message.role === "user"
                      ? "self-end text-right text-foreground"
                      : "self-start text-muted-foreground"
                  )}
                >
                  {message.content}
                </p>
              ))}
            </div>
            <form className="flex gap-2 pt-3" onSubmit={onSubmitChat}>
              <label className="sr-only" htmlFor="area-chat-input">
                Ask a question
              </label>
              <input
                id="area-chat-input"
                className="flex-1 rounded-lg border border-border bg-background p-2 text-sm"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
              />
              <Button type="submit" disabled={chat.streaming}>
                Send
              </Button>
            </form>
          </AIPanel>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">AI Diagnostic Summary</span>
            <InfoButton textKey="areaAiSummaryPanel" />
          </div>
          {flaggedKpi ? (
            <AIPanel>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Pattern</span>
                  <span className="font-medium">{flaggedKpi.pattern}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">{flaggedKpi.confidence}</span>
                </div>
                <p>{flaggedKpi.description}</p>
                <p className="text-muted-foreground">{flaggedKpi.suggested_focus}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  onClick={() => setChatOpen(true)}
                >
                  Chat with {flaggedKpi.indicator_name}
                </Button>
              </div>
            </AIPanel>
          ) : (
            <p className="text-sm text-muted-foreground">
              No AI diagnostic available for this area right now.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
