import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useRoleStore } from "@/store/role-store";

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
}

beforeEach(() => {
  useRoleStore.setState({ role: null, areaId: null, profileLabel: null });
});

describe("Sidebar", () => {
  it("hides Executive Overview from a manager but shows their other nav items", () => {
    useRoleStore.setState({ role: "manager", areaId: "area-1", profileLabel: "Sales Manager" });

    renderSidebar();

    expect(screen.queryByText("Executive Overview")).not.toBeInTheDocument();
    expect(screen.getByText("Strategy Graph")).toBeInTheDocument();
    expect(screen.getByText("Area Dashboard")).toBeInTheDocument();
  });

  it("shows Executive Overview and Strategy Graph to an executive, but not Area Dashboard (no area is bound to them)", () => {
    useRoleStore.setState({ role: "executive", areaId: null, profileLabel: "Executive" });

    renderSidebar();

    expect(screen.getByText("Executive Overview")).toBeInTheDocument();
    expect(screen.getByText("Strategy Graph")).toBeInTheDocument();
    expect(screen.queryByText("Area Dashboard")).not.toBeInTheDocument();
  });

  it("shows Executive Overview and Strategy Graph to an admin, but not Area Dashboard (no area is bound to them)", () => {
    useRoleStore.setState({ role: "admin", areaId: null, profileLabel: "Admin" });

    renderSidebar();

    expect(screen.getByText("Executive Overview")).toBeInTheDocument();
    expect(screen.getByText("Strategy Graph")).toBeInTheDocument();
    expect(screen.queryByText("Area Dashboard")).not.toBeInTheDocument();
  });
});
