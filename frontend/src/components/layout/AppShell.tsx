import { Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useRoleStore } from "@/store/role-store";

export function AppShell() {
  const role = useRoleStore((state) => state.role);

  if (!role) {
    return <Navigate to="/select" replace />;
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
