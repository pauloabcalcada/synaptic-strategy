import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "executive" | "manager" | "admin" | null;

interface RoleState {
  role: Role;
  areaId: string | null;
  profileLabel: string | null;
  setRole: (role: Role, areaId: string | null, profileLabel?: string | null) => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: null,
      areaId: null,
      profileLabel: null,
      setRole: (role, areaId, profileLabel = null) => set({ role, areaId, profileLabel }),
    }),
    { name: "synaptic-strategy-role" }
  )
);
