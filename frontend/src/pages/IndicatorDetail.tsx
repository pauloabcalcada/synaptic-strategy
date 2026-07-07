import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useIndicator } from "@/hooks/useIndicator";
import { useCommentary } from "@/hooks/useCommentary";
import { useDiagnostic } from "@/hooks/useDiagnostic";
import { useActionPlan, type ActionPlanContent } from "@/hooks/useActionPlan";
import { useChat } from "@/hooks/useChat";
import { useRoleStore } from "@/store/role-store";
import { canOpenIndicator, canWrite, startPageFor } from "@/lib/roleAccess";
import { Button } from "@/components/ui/button";
import { InfoButton } from "@/components/ui/info-button";
import { AIPanel } from "@/components/ui/ai-panel";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  on_track: "text-success",
  at_risk: "text-warning",
  off_track: "text-destructive",
};

const commentaryFormSchema = z.object({
  content: z.string(),
});

type CommentaryFormValues = z.infer<typeof commentaryFormSchema>;

const actionPlanFormSchema = z.object({
  probable_causes: z.string(),
  monitoring_suggestion: z.string(),
});

type ActionPlanFormValues = z.infer<typeof actionPlanFormSchema>;

function toActionPlanFormValues(content: ActionPlanContent): ActionPlanFormValues {
  return {
    probable_causes: content.probable_causes.join("\n"),
    monitoring_suggestion: content.monitoring_suggestion,
  };
}

export function IndicatorDetail() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const indicatorAreaId = searchParams.get("areaId");
  const role = useRoleStore((state) => state.role);
  const areaId = useRoleStore((state) => state.areaId);
  const profileLabel = useRoleStore((state) => state.profileLabel);
  const author = profileLabel ?? role ?? "";
  const [period, setPeriod] = useState<string | undefined>(undefined);
  const { data, loading, error } = useIndicator(code, period);
  const commentaryPeriod = data?.period;
  const {
    data: commentary,
    save: saveCommentary,
  } = useCommentary(code, commentaryPeriod);
  const { data: diagnostic } = useDiagnostic(code, commentaryPeriod);
  const [diagnosticExpanded, setDiagnosticExpanded] = useState(false);
  const actionPlan = useActionPlan(code, commentaryPeriod);
  const activeActionPlanContent = actionPlan.draft ?? actionPlan.data?.content ?? null;
  const chat = useChat(code, role ?? "");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const form = useForm<CommentaryFormValues>({
    resolver: zodResolver(commentaryFormSchema),
    values: { content: commentary?.content ?? "" },
  });

  const actionPlanForm = useForm<ActionPlanFormValues>({
    resolver: zodResolver(actionPlanFormSchema),
    values: activeActionPlanContent
      ? toActionPlanFormValues(activeActionPlanContent)
      : { probable_causes: "", monitoring_suggestion: "" },
  });

  async function onSubmitCommentary(values: CommentaryFormValues) {
    await saveCommentary(values.content, author);
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

  async function onSubmitActionPlan(values: ActionPlanFormValues) {
    if (!activeActionPlanContent) {
      return;
    }
    await actionPlan.save(
      {
        probable_causes: values.probable_causes.split("\n"),
        actions: activeActionPlanContent.actions,
        monitoring_suggestion: values.monitoring_suggestion,
      },
      author
    );
  }

  if (indicatorAreaId !== null && !canOpenIndicator(role, areaId, indicatorAreaId)) {
    return <Navigate to={startPageFor(role)} replace />;
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading indicator…</div>;
  }

  if (error || !data) {
    return (
      <div className="text-destructive">
        Couldn't load the indicator. Please try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.code}</p>
        </div>
        <div className="flex items-start gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Period</span>
            <select
              className="rounded-lg border border-border bg-background px-2 py-1"
              value={data.period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              {data.history.map((entry) => (
                <option key={entry.period} value={entry.period}>
                  {entry.period}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" onClick={() => setChatOpen(true)}>
            Chat with this Indicator
          </Button>
        </div>
      </div>

      {chatOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border bg-background p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat with {data.name}</h2>
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
              <label className="sr-only" htmlFor="chat-input">
                Ask a question
              </label>
              <input
                id="chat-input"
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

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Unit</dt>
          <dd>{data.unit}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            Polarity
            <InfoButton textKey="polarity" />
          </dt>
          <dd>{data.polarity}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            Accumulation type
            <InfoButton textKey="accumulationType" />
          </dt>
          <dd>{data.accumulation_type}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">KPI type</dt>
          <dd>{data.kpi_type}</dd>
        </div>
        <div className="col-span-2">
          <dt className="flex items-center gap-1 text-muted-foreground">
            Calculation method
            <InfoButton textKey="calculationMethod" />
          </dt>
          <dd>{data.calculation_method}</dd>
        </div>
        <div className="col-span-2">
          <dt className="flex items-center gap-1 text-muted-foreground">
            Composition
            <InfoButton textKey="composition" />
          </dt>
          <dd>{data.composition}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-4">
        <span className="rounded-lg bg-card px-4 py-2 font-mono text-2xl">
          {data.result} {data.unit}
        </span>
        <span className="rounded-lg bg-muted px-3 py-1 font-mono text-lg">
          Target: {data.target} {data.unit}
        </span>
        <span className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-lg font-semibold text-primary-foreground">
          {data.kpi_score}
          <InfoButton textKey="scoreCurve" />
        </span>
        <span className={cn("font-medium", STATUS_STYLES[data.status])}>
          {data.status}
        </span>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.history}>
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="result"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              name="Result"
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
              name="Target"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {diagnostic && (
        <AIPanel>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-sm font-medium"
            aria-expanded={diagnosticExpanded}
            onClick={() => setDiagnosticExpanded((expanded) => !expanded)}
          >
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
              AI Diagnostic Available
            </span>
          </button>
          {diagnosticExpanded && (
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Pattern</span>
                <span className="font-medium">{diagnostic.pattern}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">{diagnostic.confidence}</span>
              </div>
              <p>{diagnostic.description}</p>
              <p className="text-muted-foreground">{diagnostic.suggested_focus}</p>
            </div>
          )}
        </AIPanel>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={form.handleSubmit(onSubmitCommentary)}
      >
        <div className="flex items-center gap-1">
          <label htmlFor="commentary-content" className="text-sm text-muted-foreground">
            Commentary
          </label>
          <InfoButton textKey="commentaryPanel" />
        </div>
        <textarea
          id="commentary-content"
          className="min-h-24 rounded-lg border border-border bg-background p-2 text-sm"
          {...form.register("content")}
        />
        <Button type="submit" className="self-start" disabled={form.formState.isSubmitting}>
          Save commentary
        </Button>
      </form>

      {canWrite(role) && data.status === "off_track" && (
        <AIPanel>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => actionPlan.generate()}
            >
              Suggest Action Plan
            </Button>

            {activeActionPlanContent && (
              <form
                className="flex flex-col gap-2"
                onSubmit={actionPlanForm.handleSubmit(onSubmitActionPlan)}
              >
                <label htmlFor="action-plan-causes" className="text-sm text-muted-foreground">
                  Probable causes
                </label>
                <textarea
                  id="action-plan-causes"
                  className="min-h-16 rounded-lg border border-border bg-background p-2 text-sm"
                  {...actionPlanForm.register("probable_causes")}
                />
                <label htmlFor="action-plan-monitoring" className="text-sm text-muted-foreground">
                  Monitoring suggestion
                </label>
                <textarea
                  id="action-plan-monitoring"
                  className="min-h-16 rounded-lg border border-border bg-background p-2 text-sm"
                  {...actionPlanForm.register("monitoring_suggestion")}
                />
                <Button
                  type="submit"
                  className="self-start"
                  disabled={actionPlanForm.formState.isSubmitting}
                >
                  Save action plan
                </Button>
              </form>
            )}
          </div>
        </AIPanel>
      )}
    </div>
  );
}
