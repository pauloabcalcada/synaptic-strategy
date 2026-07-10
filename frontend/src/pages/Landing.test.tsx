import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

      const heading = screen.getByRole("heading", { name: /^how it works$/i });
      const section = heading.closest("section") as HTMLElement;

      expect(within(section).getByText("Company Strategy")).toBeInTheDocument();
      expect(within(section).getByText("Departments")).toBeInTheDocument();
      expect(within(section).getByText("KPIs")).toBeInTheDocument();
      expect(within(section).getByText("Scores")).toBeInTheDocument();
      expect(within(section).getByText("AI Insights")).toBeInTheDocument();
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
    it("renders a 'Choose your perspective' section with one manager card per area plus an Executive and Admin card", async () => {
      renderLanding();

      expect(
        screen.getByRole("heading", { name: /choose your perspective/i })
      ).toBeInTheDocument();
      expect(await screen.findByText("Sales Manager")).toBeInTheDocument();
      expect(screen.getByText("Support Manager")).toBeInTheDocument();
      expect(screen.getByText("Executive")).toBeInTheDocument();
      expect(screen.getByText("Platform Admin")).toBeInTheDocument();
    });

    function statTileValue(card: HTMLElement, label: string): string | null {
      const labelEl = within(card).getByText(label);
      return labelEl.previousElementSibling?.textContent ?? null;
    }

    it("shows KPI count, on-track count, and off-track count stat tiles on each manager card", async () => {
      renderLanding();
      await screen.findByText("Sales Manager");

      const salesCard = screen.getByTestId("role-card-area-1");
      expect(statTileValue(salesCard, "KPIs")).toBe("5");
      expect(statTileValue(salesCard, "On Track")).toBe("3");
      expect(statTileValue(salesCard, "Off Track")).toBe("1");

      const supportCard = screen.getByTestId("role-card-area-2");
      expect(statTileValue(supportCard, "KPIs")).toBe("4");
      expect(statTileValue(supportCard, "On Track")).toBe("4");
      expect(statTileValue(supportCard, "Off Track")).toBe("0");
    });

    it("shows aggregate KPI stat tiles across all areas on the Executive and Admin cards", async () => {
      renderLanding();
      await screen.findByText("Sales Manager");

      // totals: kpi_count 5+4=9, on_track 3+4=7, off_track 1+0=1
      const executiveCard = screen.getByTestId("role-card-executive");
      expect(statTileValue(executiveCard, "KPIs")).toBe("9");
      expect(statTileValue(executiveCard, "On Track")).toBe("7");
      expect(statTileValue(executiveCard, "Off Track")).toBe("1");

      const adminCard = screen.getByTestId("role-card-admin");
      expect(statTileValue(adminCard, "KPIs")).toBe("9");
      expect(statTileValue(adminCard, "On Track")).toBe("7");
      expect(statTileValue(adminCard, "Off Track")).toBe("1");
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
        screen.getByRole("button", { name: "Enter as Platform Admin →" })
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

      const card = await screen.findByRole("button", {
        name: "Enter as Platform Admin →",
      });
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
