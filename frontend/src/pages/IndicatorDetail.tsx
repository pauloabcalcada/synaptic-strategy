import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useIndicator } from "@/hooks/useIndicator";
import { useCommentary } from "@/hooks/useCommentary";
import { useRoleStore } from "@/store/role-store";
import { Button } from "@/components/ui/button";
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

export function IndicatorDetail() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const role = useRoleStore((state) => state.role);
  const [period, setPeriod] = useState<string | undefined>(undefined);
  const { data, loading, error } = useIndicator(code, period);
  const commentaryPeriod = data?.period;
  const {
    data: commentary,
    save: saveCommentary,
  } = useCommentary(code, commentaryPeriod);

  const form = useForm<CommentaryFormValues>({
    resolver: zodResolver(commentaryFormSchema),
    values: { content: commentary?.content ?? "" },
  });

  async function onSubmitCommentary(values: CommentaryFormValues) {
    await saveCommentary(values.content, role ?? "");
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
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Unit</dt>
          <dd>{data.unit}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Polarity</dt>
          <dd>{data.polarity}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Accumulation type</dt>
          <dd>{data.accumulation_type}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">KPI type</dt>
          <dd>{data.kpi_type}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Calculation method</dt>
          <dd>{data.calculation_method}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Composition</dt>
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
        <span className="rounded-lg bg-primary px-3 py-1 text-lg font-semibold text-primary-foreground">
          {data.kpi_score}
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

      <form
        className="flex flex-col gap-2"
        onSubmit={form.handleSubmit(onSubmitCommentary)}
      >
        <label htmlFor="commentary-content" className="text-sm text-muted-foreground">
          Commentary
        </label>
        <textarea
          id="commentary-content"
          className="min-h-24 rounded-lg border border-border bg-background p-2 text-sm"
          {...form.register("content")}
        />
        <Button type="submit" className="self-start" disabled={form.formState.isSubmitting}>
          Save commentary
        </Button>
      </form>
    </div>
  );
}
