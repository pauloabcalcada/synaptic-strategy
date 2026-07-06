import { NavLink, useNavigate } from "react-router-dom";
import { useRoleStore } from "@/store/role-store";

const navItems = [
  { to: "/executive", label: "Executive Overview" },
  { to: "/graph", label: "Strategy Graph" },
  { to: "/area", label: "Area Dashboard" },
];

export function Sidebar() {
  const { role, areaId, setRole } = useRoleStore();
  const navigate = useNavigate();

  function switchRole() {
    setRole(null, null);
    navigate("/select");
  }

  return (
    <div className="flex h-screen w-[220px] shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar">
      <div className="px-3.5 pt-4.5">
        <NavLink
          to="/"
          className="mb-7 flex w-full items-center gap-2.5 py-1 no-underline"
        >
          <div className="flex size-6.5 shrink-0 items-center justify-center rounded-[5px] bg-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="text-[13px] font-bold tracking-tight text-foreground">
            Synaptic Strategy
          </span>
        </NavLink>
        <div className="mb-1.5 px-2 font-mono text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
          Navigation
        </div>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px] font-medium no-underline transition-colors hover:bg-white/5 ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`size-[5px] shrink-0 rounded-full ${
                      isActive ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-3.5">
        <div className="rounded-md bg-surface px-3.5 py-3">
          <div className="mb-1 font-mono text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Active role
          </div>
          <div className="mb-0.5 text-[13px] font-semibold text-primary">
            {role ?? "No role selected"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {areaId ?? "—"}
          </div>
          <button
            onClick={switchRole}
            className="mt-2 font-mono text-[10px] tracking-wide text-primary uppercase hover:underline"
          >
            Switch role
          </button>
        </div>
      </div>
    </div>
  );
}
