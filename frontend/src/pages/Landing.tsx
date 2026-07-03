import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

type BackendStatus = "checking" | "connected" | "unreachable";

export function Landing() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<BackendStatus>("checking");

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
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

      <Button onClick={() => navigate("/executive")} size="lg">
        Explore the Platform →
      </Button>

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
    </div>
  );
}
