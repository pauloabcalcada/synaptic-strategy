import { describe, expect, it, beforeEach } from "vitest";
import { useRoleStore } from "./role-store";

beforeEach(() => {
  useRoleStore.setState({ role: null, areaId: null, profileLabel: null });
});

describe("useRoleStore", () => {
  it("sets role, areaId, and profileLabel via setRole", () => {
    useRoleStore.getState().setRole("manager", "area-1", "Sales Manager");

    const state = useRoleStore.getState();
    expect(state.role).toBe("manager");
    expect(state.areaId).toBe("area-1");
    expect(state.profileLabel).toBe("Sales Manager");
  });

  it("defaults profileLabel to null when omitted", () => {
    useRoleStore.getState().setRole("executive", null);

    expect(useRoleStore.getState().profileLabel).toBeNull();
  });

  it("supports the admin role", () => {
    useRoleStore.getState().setRole("admin", null, "Admin");

    expect(useRoleStore.getState().role).toBe("admin");
  });
});
