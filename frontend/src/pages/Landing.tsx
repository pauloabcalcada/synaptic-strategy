import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, ClipboardList, MessageCircle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useRoleStore } from "@/store/role-store";
import { profileLabelFor, startPageFor } from "@/lib/roleAccess";
import { useAreas, type AreaSummary, type KpiStatus } from "@/hooks/useAreas";
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

const STATUS_CHIP_STYLES: Record<KpiStatus, string> = {
  on_track: "text-success",
  at_risk: "text-warning",
  off_track: "text-destructive",
};

const STATUS_CHIP_LABELS: Record<KpiStatus, string> = {
  on_track: "on track",
  at_risk: "at risk",
  off_track: "off track",
};

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

interface RoleCardProps {
  kicker: string;
  title: string;
  description: string;
  chips?: { label: string; className?: string }[];
  ctaLabel: string;
  onSelect: () => void;
}

function RoleCard({ kicker, title, description, chips, ctaLabel, onSelect }: RoleCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-primary">
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {kicker}
      </span>
      <span className="text-lg font-semibold text-foreground">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-xs text-muted-foreground",
                "bg-muted",
                chip.className
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
      <Button onClick={onSelect} size="lg" className="mt-1 w-full">
        {ctaLabel}
      </Button>
    </div>
  );
}

const STATUS_CHIP_ORDER: KpiStatus[] = ["on_track", "at_risk", "off_track"];

function areaStatChips(area: AreaSummary): { label: string; className?: string }[] {
  return [
    { label: `${area.kpi_count} KPIs` },
    ...STATUS_CHIP_ORDER.map((status) => ({
      label: `${area.status_breakdown[status] ?? 0} ${STATUS_CHIP_LABELS[status]}`,
      className: STATUS_CHIP_STYLES[status],
    })),
  ];
}

export function Landing() {
  const navigate = useNavigate();
  const setRole = useRoleStore((state) => state.setRole);
  const [status, setStatus] = useState<BackendStatus>("checking");
  const { areas, error: areasError } = useAreas();

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
        <div className="font-mono text-[11px] tracking-widest text-primary uppercase">
          Choose a role
        </div>
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RoleCard
            kicker="Executive"
            title="Executive"
            description="All areas, pillars, and strategy at a glance."
            ctaLabel="Enter as Executive →"
            onSelect={chooseExecutive}
          />

          <RoleCard
            kicker="Admin"
            title="Admin"
            description="Full portfolio visibility and write access."
            ctaLabel="Enter as Admin →"
            onSelect={chooseAdmin}
          />

          {areasError !== null && (
            <div className="col-span-full text-sm text-destructive">
              Couldn't load the list of areas. Please try again.
            </div>
          )}

          {areas?.map((area) => {
            const profileLabel = profileLabelFor(area);
            return (
              <RoleCard
                key={area.id}
                kicker={area.pillar}
                title={profileLabel}
                description={`Score ${area.score.toFixed(1)} · Grade ${area.grade}`}
                chips={areaStatChips(area)}
                ctaLabel={`Enter as ${profileLabel} →`}
                onSelect={() => chooseArea(area)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
