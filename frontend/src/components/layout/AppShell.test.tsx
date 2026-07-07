import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useRoleStore } from "@/store/role-store";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>Landing Page</div>} />
        <Route element={<AppShell />}>
          <Route path="/executive" element={<div>Executive Page</div>} />
          <Route path="/area" element={<div>Area Page</div>} />
          <Route path="/graph" element={<div>Graph Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useRoleStore.setState({ role: null, areaId: null, profileLabel: null });
});

describe("AppShell", () => {
  it("redirects to / when no role is selected", () => {
    renderAt("/executive");

    expect(screen.getByText("Landing Page")).toBeInTheDocument();
  });

  it("redirects a manager away from the Executive Overview to their own area", () => {
    useRoleStore.setState({ role: "manager", areaId: "area-1", profileLabel: "Sales Manager" });

    renderAt("/executive");

    expect(screen.getByText("Area Page")).toBeInTheDocument();
  });

  it("allows an executive to view the Executive Overview", () => {
    useRoleStore.setState({ role: "executive", areaId: null, profileLabel: "Executive" });

    renderAt("/executive");

    expect(screen.getByText("Executive Page")).toBeInTheDocument();
  });

  it("allows an admin to view the Executive Overview", () => {
    useRoleStore.setState({ role: "admin", areaId: null, profileLabel: "Admin" });

    renderAt("/executive");

    expect(screen.getByText("Executive Page")).toBeInTheDocument();
  });

  it("allows a manager to view their own area dashboard", () => {
    useRoleStore.setState({ role: "manager", areaId: "area-1", profileLabel: "Sales Manager" });

    renderAt("/area");

    expect(screen.getByText("Area Page")).toBeInTheDocument();
  });

  it("redirects an executive away from the Area Dashboard (no area is bound to them)", () => {
    useRoleStore.setState({ role: "executive", areaId: null, profileLabel: "Executive" });

    renderAt("/area");

    expect(screen.getByText("Executive Page")).toBeInTheDocument();
  });

  it("redirects an admin away from the Area Dashboard (no area is bound to them)", () => {
    useRoleStore.setState({ role: "admin", areaId: null, profileLabel: "Admin" });

    renderAt("/area");

    expect(screen.getByText("Executive Page")).toBeInTheDocument();
  });
});
