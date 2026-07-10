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
  {
    id: "area-1",
    name: "Sales",
    pillar: "Growth",
    score: 82.3,
    grade: "B",
    kpi_count: 5,
    status_breakdown: { on_track: 3, at_risk: 1, off_track: 1 },
  },
  {
    id: "area-2",
    name: "Support",
    pillar: "Ops",
    score: 91.0,
    grade: "A",
    kpi_count: 4,
    status_breakdown: { on_track: 4 },
  },
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
  describe("marketing sections", () => {
    it("renders the hero with the product name and pitch", () => {
      renderLanding();

      expect(
        screen.getByRole("heading", { level: 1, name: /Synaptic\s*Strategy/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/cascades corporate strategy across departments/i)
      ).toBeInTheDocument();
    });

    it("has an Explore the Platform CTA in the hero that links to the role selector", () => {
      renderLanding();

      const cta = screen.getByRole("link", { name: /Explore the Platform/i });
      expect(cta).toHaveAttribute("href", "#role-selector");
    });

    it("renders the problem explainer section, including the real-world inspiration", () => {
      renderLanding();

      expect(
        screen.getByRole("heading", { name: /what this project is/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/inspired by/i)).toBeInTheDocument();
    });

    it("renders the how-it-works flow", () => {
      renderLanding();

      expect(
        screen.getByRole("heading", { name: /how it works/i })
      ).toBeInTheDocument();
      expect(screen.getByText("Company Strategy")).toBeInTheDocument();
      expect(screen.getByText("Departments")).toBeInTheDocument();
      expect(screen.getByText("KPIs")).toBeInTheDocument();
      expect(screen.getByText("Scores")).toBeInTheDocument();
      expect(screen.getByText("AI Insights")).toBeInTheDocument();
    });

    it("renders one card per AI feature with a name and description", () => {
      renderLanding();

      expect(
        screen.getByRole("heading", { name: "Deviation Diagnostic" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Action Plan Generator" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Indicator Chat" })
      ).toBeInTheDocument();
    });

    it("renders tech stack badges", () => {
      renderLanding();

      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("FastAPI")).toBeInTheDocument();
      expect(screen.getByText("LangChain")).toBeInTheDocument();
    });
  });

  describe("role selector", () => {
    it("renders one manager card per area plus an Executive and Admin card", async () => {
      renderLanding();

      expect(await screen.findByText("Sales Manager")).toBeInTheDocument();
      expect(screen.getByText("Support Manager")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Enter as Executive →" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Enter as Admin →" })
      ).toBeInTheDocument();
    });

    it("shows KPI count and status-breakdown stat chips on each manager card", async () => {
      renderLanding();

      await screen.findByText("Sales Manager");

      expect(screen.getByText("5 KPIs")).toBeInTheDocument();
      expect(screen.getByText("3 on track")).toBeInTheDocument();
      expect(screen.getByText("1 at risk")).toBeInTheDocument();
      expect(screen.getByText("1 off track")).toBeInTheDocument();

      expect(screen.getByText("4 KPIs")).toBeInTheDocument();
      expect(screen.getByText("4 on track")).toBeInTheDocument();
      expect(screen.getByText("0 at risk")).toBeInTheDocument();
      expect(screen.getByText("0 off track")).toBeInTheDocument();
    });

    it("shows a full-width Enter as [Role] CTA on every role card", async () => {
      renderLanding();

      await screen.findByText("Sales Manager");

      expect(
        screen.getByRole("button", { name: "Enter as Sales Manager →" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Enter as Support Manager →" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Enter as Executive →" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Enter as Admin →" })
      ).toBeInTheDocument();
    });

    it("selecting a manager card sets role/areaId/profileLabel and navigates to the area dashboard", async () => {
      renderLanding();

      const card = await screen.findByRole("button", {
        name: "Enter as Sales Manager →",
      });
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

      const card = await screen.findByRole("button", { name: "Enter as Executive →" });
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

      const card = await screen.findByRole("button", { name: "Enter as Admin →" });
      await userEvent.click(card);

      expect(useRoleStore.getState()).toMatchObject({
        role: "admin",
        areaId: null,
        profileLabel: "Admin",
      });
      expect(await screen.findByText("Executive Overview Page")).toBeInTheDocument();
    });

    it("shows an error message when areas fail to load", async () => {
      mockedGet.mockImplementation((url: string) => {
        if (url === "/health") {
          return Promise.resolve({ data: {} });
        }
        if (url === "/api/areas") {
          return Promise.reject(new Error("network error"));
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      });

      renderLanding();

      expect(
        await screen.findByText(/Couldn't load the list of areas/i)
      ).toBeInTheDocument();
    });
  });
});
