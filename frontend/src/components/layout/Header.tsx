import { useLocation } from "react-router-dom";

const titles: Record<string, string> = {
  "/executive": "Executive Overview",
  "/graph": "Strategy Relationship Graph",
  "/area": "Area Dashboard",
  "/indicator": "Indicator Detail",
};

function titleFor(pathname: string) {
  const match = Object.keys(titles).find((path) => pathname.startsWith(path));
  return match ? titles[match] : "Synaptic Strategy";
}

export function Header() {
  const location = useLocation();

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border px-8">
      <h1 className="text-sm font-semibold tracking-tight text-foreground">
        {titleFor(location.pathname)}
      </h1>
    </header>
  );
}
