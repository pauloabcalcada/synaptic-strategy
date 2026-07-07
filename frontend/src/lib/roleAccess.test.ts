import { describe, expect, it } from "vitest";
import {
  canSeeExecutive,
  canSeeGraph,
  visibleAreasFor,
  canOpenIndicator,
  canWrite,
  profileLabelFor,
  startPageFor,
} from "./roleAccess";

describe("canSeeExecutive", () => {
  it("is true for executive and admin, false for manager and no role", () => {
    expect(canSeeExecutive("executive")).toBe(true);
    expect(canSeeExecutive("admin")).toBe(true);
    expect(canSeeExecutive("manager")).toBe(false);
    expect(canSeeExecutive(null)).toBe(false);
  });
});

describe("canSeeGraph", () => {
  it("is always true regardless of role", () => {
    expect(canSeeGraph("executive")).toBe(true);
    expect(canSeeGraph("admin")).toBe(true);
    expect(canSeeGraph("manager")).toBe(true);
    expect(canSeeGraph(null)).toBe(true);
  });
});

describe("visibleAreasFor", () => {
  it("returns 'all' for executive and admin", () => {
    expect(visibleAreasFor("executive", null)).toBe("all");
    expect(visibleAreasFor("admin", null)).toBe("all");
  });

  it("returns only the manager's own area", () => {
    expect(visibleAreasFor("manager", "area-1")).toEqual(["area-1"]);
  });

  it("returns an empty list for a manager with no area or no role", () => {
    expect(visibleAreasFor("manager", null)).toEqual([]);
    expect(visibleAreasFor(null, null)).toEqual([]);
  });
});

describe("canOpenIndicator", () => {
  it("allows executive and admin to open any area's indicator", () => {
    expect(canOpenIndicator("executive", null, "area-1")).toBe(true);
    expect(canOpenIndicator("admin", null, "area-2")).toBe(true);
  });

  it("allows a manager to open an indicator in their own area", () => {
    expect(canOpenIndicator("manager", "area-1", "area-1")).toBe(true);
  });

  it("rejects a manager opening an indicator in a foreign area", () => {
    expect(canOpenIndicator("manager", "area-1", "area-2")).toBe(false);
  });

  it("rejects a manager when the indicator's area is unknown", () => {
    expect(canOpenIndicator("manager", "area-1", null)).toBe(false);
  });

  it("rejects when there is no role", () => {
    expect(canOpenIndicator(null, null, "area-1")).toBe(false);
  });
});

describe("canWrite", () => {
  it("is true for manager and admin, false for executive and no role", () => {
    expect(canWrite("manager")).toBe(true);
    expect(canWrite("admin")).toBe(true);
    expect(canWrite("executive")).toBe(false);
    expect(canWrite(null)).toBe(false);
  });
});

describe("profileLabelFor", () => {
  it("derives '<Area> Manager' from the area name", () => {
    expect(profileLabelFor({ id: "area-1", name: "Sales" })).toBe(
      "Sales Manager"
    );
  });
});

describe("startPageFor", () => {
  it("sends managers to their area dashboard", () => {
    expect(startPageFor("manager")).toBe("/area");
  });

  it("sends executives and admins to the Executive Overview", () => {
    expect(startPageFor("executive")).toBe("/executive");
    expect(startPageFor("admin")).toBe("/executive");
  });

  it("defaults to the landing page when there is no role", () => {
    expect(startPageFor(null)).toBe("/");
  });
});
