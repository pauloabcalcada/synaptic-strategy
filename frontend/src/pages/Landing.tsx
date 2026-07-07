import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useRoleStore } from "@/store/role-store";
import { profileLabelFor, startPageFor } from "@/lib/roleAccess";
import { cn } from "@/lib/utils";

type BackendStatus = "checking" | "connected" | "unreachable";

interface AreaSummary {
  id: string;
  name: string;
  pillar: string;
  score: number;
  grade: string;
}

export function Landing() {
  const navigate = useNavigate();
  const setRole = useRoleStore((state) => state.setRole);
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [areas, setAreas] = useState<AreaSummary[] | null>(null);
  const [areasError, setAreasError] = useState(false);

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

  useEffect(() => {
    api
      .get<AreaSummary[]>("/api/areas")
      .then((response) => setAreas(response.data))
      .catch(() => setAreasError(true));
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-16 text-center">
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
      </div>

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

      <div className="flex flex-col items-center gap-4">
        <div className="font-mono text-[11px] tracking-widest text-primary uppercase">
          Choose a role
        </div>
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={chooseExecutive}
            className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary"
          >
            <span className="font-mono text-[10px] tracking-widest text-primary uppercase">
              Executive
            </span>
            <span className="text-lg font-semibold text-foreground">
              Portfolio Overview
            </span>
            <span className="text-sm text-muted-foreground">
              All areas, pillars, and strategy at a glance.
            </span>
          </button>

          <button
            onClick={chooseAdmin}
            className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary"
          >
            <span className="font-mono text-[10px] tracking-widest text-primary uppercase">
              Admin
            </span>
            <span className="text-lg font-semibold text-foreground">
              Administration
            </span>
            <span className="text-sm text-muted-foreground">
              Full portfolio visibility and write access.
            </span>
          </button>

          {areasError && (
            <div className="col-span-full text-sm text-destructive">
              Couldn't load the list of areas. Please try again.
            </div>
          )}

          {areas?.map((area) => (
            <button
              key={area.id}
              onClick={() => chooseArea(area)}
              className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary"
            >
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {area.pillar}
              </span>
              <span className="text-lg font-semibold text-foreground">
                {profileLabelFor(area)}
              </span>
              <span className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                {area.score.toFixed(1)}
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-semibold text-primary-foreground",
                    "bg-primary"
                  )}
                >
                  {area.grade}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
