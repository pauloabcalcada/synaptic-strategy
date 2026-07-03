import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "executive" | "manager" | null;

interface RoleState {
  role: Role;
  areaId: string | null;
  setRole: (role: Role, areaId: string | null) => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: null,
      areaId: null,
      setRole: (role, areaId) => set({ role, areaId }),
    }),
    { name: "synaptic-strategy-role" }
  )
);
