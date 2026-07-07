import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./Landing";
import { api } from "@/lib/api";
import { useRoleStore } from "@/store/role-store";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn() },
}));
const mockedGet = vi.mocked(api.get);

const AREAS = [
  { id: "area-1", name: "Sales", pillar: "Growth", score: 82.3, grade: "B" },
  { id: "area-2", name: "Support", pillar: "Ops", score: 91.0, grade: "A" },
];

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/area" element={<div>Area Dashboard Page</div>} />
        <Route path="/executive" element={<div>Executive Overview Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockedGet.mockReset();
  useRoleStore.setState({ role: null, areaId: null, profileLabel: null });
  mockedGet.mockImplementation((url: string) => {
    if (url === "/health") {
      return Promise.resolve({ data: {} });
    }
    if (url === "/api/areas") {
      return Promise.resolve({ data: AREAS });
    }
    return Promise.reject(new Error(`unexpected url ${url}`));
  });
});

describe("Landing", () => {
  it("renders one manager card per area plus an Executive and Admin card", async () => {
    renderLanding();

    expect(await screen.findByText("Sales Manager")).toBeInTheDocument();
    expect(screen.getByText("Support Manager")).toBeInTheDocument();
    expect(screen.getByText("82.3")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("Executive")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("selecting a manager card sets role/areaId/profileLabel and navigates to the area dashboard", async () => {
    renderLanding();

    const card = await screen.findByText("Sales Manager");
    await userEvent.click(card);

    expect(useRoleStore.getState()).toMatchObject({
      role: "manager",
      areaId: "area-1",
      profileLabel: "Sales Manager",
    });
    expect(await screen.findByText("Area Dashboard Page")).toBeInTheDocument();
  });

  it("selecting the Executive card sets role and navigates to the Executive Overview", async () => {
    renderLanding();

    const card = await screen.findByText("Executive");
    await userEvent.click(card);

    expect(useRoleStore.getState()).toMatchObject({
      role: "executive",
      areaId: null,
      profileLabel: "Executive",
    });
    expect(await screen.findByText("Executive Overview Page")).toBeInTheDocument();
  });

  it("selecting the Admin card sets role and navigates to the Executive Overview", async () => {
    renderLanding();

    const card = await screen.findByText("Admin");
    await userEvent.click(card);

    expect(useRoleStore.getState()).toMatchObject({
      role: "admin",
      areaId: null,
      profileLabel: "Admin",
    });
    expect(await screen.findByText("Executive Overview Page")).toBeInTheDocument();
  });
});
