import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, ClipboardList, MessageCircle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useRoleStore } from "@/store/role-store";
import { profileLabelFor, startPageFor } from "@/lib/roleAccess";
import { useAreas, type AreaSummary } from "@/hooks/useAreas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ROLE_SELECTOR_ID = "role-selector";

type BackendStatus = "checking" | "connected" | "unreachable";

const HOW_IT_WORKS_STEPS = [
  "Company Strategy",
  "Departments",
  "KPIs",
  "Scores",
  "AI Insights",
];

const AI_FEATURES = [
  {
    icon: Stethoscope,
    name: "Deviation Diagnostic",
    description:
      "Automatically classifies why an off-track KPI is underperforming — sudden drop, gradual decline, seasonal dip, or persistent issue. Managers get an instant read on the shape of the problem before digging into the numbers.",
  },
  {
    icon: ClipboardList,
    name: "Action Plan Generator",
    description:
      "Proposes a structured recovery plan for an underperforming KPI, complete with probable causes, suggested actions, and deadline types. Managers can accept, edit, or discard the plan before committing to it.",
  },
  {
    icon: MessageCircle,
    name: "Indicator Chat",
    description:
      "A conversational assistant that answers analytical questions about any KPI using its full history as context. It lets managers explore the story behind a number without leaving the page.",
  },
];

const TECH_STACK = [
  "React",
  "TypeScript",
  "Tailwind CSS",
  "FastAPI",
  "PostgreSQL",
  "LangChain",
  "OpenAI",
  "Docker",
];

const MANAGER_DESCRIPTION =
  "Access your area KPIs, write commentary, trigger AI diagnostics, and generate action plans for off-track indicators.";

const ADMIN_DESCRIPTION =
  "Full access: all KPIs, indicator registry, AI features, RAG document ingestion, and score recomputation.";

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] tracking-widest text-primary uppercase">
      {children}
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="flex w-full max-w-4xl flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <SectionKicker>From strategy to insight</SectionKicker>
        <h2 className="text-2xl font-semibold text-foreground">How it works</h2>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            <span className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
              {step}
            </span>
            {index < HOW_IT_WORKS_STEPS.length - 1 && (
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function AIFeatureCards() {
  return (
    <section className="flex w-full max-w-5xl flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <SectionKicker>AI features</SectionKicker>
        <h2 className="text-2xl font-semibold text-foreground">
          An embedded analyst for every manager
        </h2>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        {AI_FEATURES.map(({ icon: Icon, name, description }) => (
          <div
            key={name}
            className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5 text-left"
          >
            <Icon className="size-6 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TechStackBadges() {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-4">
      <SectionKicker>Built with</SectionKicker>
      <div className="flex flex-wrap justify-center gap-2">
        {TECH_STACK.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground"
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  );
}

interface StatTile {
  label: string;
  value: number;
  className?: string;
}

function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex flex-col items-center gap-0.5 rounded-md border border-border bg-background/40 px-2 py-2"
        >
          <span className={cn("font-mono text-xl font-bold text-foreground", tile.className)}>
            {tile.value}
          </span>
          <span className="text-xs text-muted-foreground">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}

function kpiStatTiles(kpiCount: number, onTrack: number, offTrack: number): StatTile[] {
  return [
    { label: "KPIs", value: kpiCount },
    { label: "On Track", value: onTrack, className: "text-success" },
    { label: "Off Track", value: offTrack, className: "text-destructive" },
  ];
}

interface RoleCardProps {
  title: string;
  description: string;
  stats?: StatTile[];
  ctaLabel: string;
  onSelect: () => void;
  testId?: string;
}

function RoleCard({ title, description, stats, ctaLabel, onSelect, testId }: RoleCardProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 text-left transition-colors hover:border-primary"
    >
      <div className="flex flex-col gap-2">
        <span className="text-lg font-semibold text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      {stats && <StatTiles tiles={stats} />}
      <Button onClick={onSelect} size="lg" className="mt-1 w-full">
        {ctaLabel}
      </Button>
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const setRole = useRoleStore((state) => state.setRole);
  const [status, setStatus] = useState<BackendStatus>("checking");
  const { areas, error: areasError } = useAreas();

  const aggregateStats = useMemo(() => {
    if (!areas) return null;
    return areas.reduce(
      (totals, area) => ({
        kpiCount: totals.kpiCount + area.kpi_count,
        onTrack: totals.onTrack + (area.status_breakdown.on_track ?? 0),
        offTrack: totals.offTrack + (area.status_breakdown.off_track ?? 0),
      }),
      { kpiCount: 0, onTrack: 0, offTrack: 0 }
    );
  }, [areas]);

  const executiveDescription = areas
    ? `Strategic overview across all ${areas.length} departments. Access the strategy relationship graph and org-wide performance heatmap.`
    : "Strategic overview across all departments. Access the strategy relationship graph and org-wide performance heatmap.";

  useEffect(() => {
    let cancelled = false;
    api
      .get("/health")
      .then(() => {
        if (!cancelled) setStatus("connected");
      })
      .catch(() => {
        if (!cancelled) setStatus("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function chooseArea(area: AreaSummary) {
    const profileLabel = profileLabelFor(area);
    setRole("manager", area.id, profileLabel);
    navigate(startPageFor("manager"));
  }

  function chooseExecutive() {
    setRole("executive", null, "Executive");
    navigate(startPageFor("executive"));
  }

  function chooseAdmin() {
    setRole("admin", null, "Admin");
    navigate(startPageFor("admin"));
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-20 bg-background px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="font-mono text-[11px] tracking-widest text-primary uppercase">
          Strategic Performance Management · NovaPay Demo
        </div>
        <h1 className="text-6xl font-bold tracking-tight text-foreground">
          Synaptic
          <br />
          <span className="text-primary">Strategy</span>
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
          An AI-powered KPI management platform that cascades corporate
          strategy across departments — making it visible, measurable, and
          conversational.
        </p>
        <div
          data-testid="backend-status"
          className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground"
        >
          <span
            className={`size-1.5 rounded-full ${
              status === "connected"
                ? "bg-success"
                : status === "unreachable"
                  ? "bg-destructive"
                  : "bg-warning"
            }`}
          />
          {status === "checking" && "Checking backend…"}
          {status === "connected" && "Backend connected"}
          {status === "unreachable" && "Backend unreachable"}
        </div>
        <a href={`#${ROLE_SELECTOR_ID}`}>
          <Button size="lg">Explore the Platform →</Button>
        </a>
      </div>

      <section className="flex max-w-2xl flex-col items-center gap-3">
        <h2 className="text-2xl font-semibold text-foreground">
          What this project is
        </h2>
        <p className="leading-relaxed text-muted-foreground">
          Large organizations often define a corporate strategy that never
          truly reaches operational teams — managers track metrics in
          isolation, and monthly reviews become bureaucratic rituals rather
          than moments of real decision-making. Synaptic Strategy was
          inspired by that gap between corporate strategy and day-to-day
          operations, and built to close it — using AI as an embedded
          analyst for every manager.
        </p>
      </section>

      <HowItWorks />
      <AIFeatureCards />
      <TechStackBadges />

      <div id={ROLE_SELECTOR_ID} className="flex flex-col items-center gap-4 scroll-mt-16">
        <SectionKicker>Explore the Platform</SectionKicker>
        <h2 className="text-3xl font-bold text-foreground">Choose your perspective</h2>
        <p className="max-w-lg text-muted-foreground">
          No login required. Select a role to experience the platform from
          that perspective.
        </p>
        <div className="grid w-full max-w-6xl gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas?.map((area) => {
            const profileLabel = profileLabelFor(area);
            return (
              <RoleCard
                key={area.id}
                testId={`role-card-${area.id}`}
                title={profileLabel}
                description={MANAGER_DESCRIPTION}
                stats={kpiStatTiles(
                  area.kpi_count,
                  area.status_breakdown.on_track ?? 0,
                  area.status_breakdown.off_track ?? 0
                )}
                ctaLabel={`Enter as ${profileLabel} →`}
                onSelect={() => chooseArea(area)}
              />
            );
          })}

          <RoleCard
            testId="role-card-executive"
            title="Executive"
            description={executiveDescription}
            stats={
              aggregateStats
                ? kpiStatTiles(
                    aggregateStats.kpiCount,
                    aggregateStats.onTrack,
                    aggregateStats.offTrack
                  )
                : undefined
            }
            ctaLabel="Enter as Executive →"
            onSelect={chooseExecutive}
          />

          <RoleCard
            testId="role-card-admin"
            title="Platform Admin"
            description={ADMIN_DESCRIPTION}
            stats={
              aggregateStats
                ? kpiStatTiles(
                    aggregateStats.kpiCount,
                    aggregateStats.onTrack,
                    aggregateStats.offTrack
                  )
                : undefined
            }
            ctaLabel="Enter as Platform Admin →"
            onSelect={chooseAdmin}
          />

          {areasError !== null && (
            <div className="col-span-full text-sm text-destructive">
              Couldn't load the list of areas. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
