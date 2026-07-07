import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useRoleStore } from "@/store/role-store";
import { canSeeExecutive, startPageFor } from "@/lib/roleAccess";

export function AppShell() {
  const role = useRoleStore((state) => state.role);
  const location = useLocation();

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (location.pathname.startsWith("/executive") && !canSeeExecutive(role)) {
    return <Navigate to={startPageFor(role)} replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
