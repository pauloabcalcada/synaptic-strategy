import type { Role } from "@/store/role-store";

export function canSeeExecutive(role: Role): boolean {
  return role === "executive" || role === "admin";
}

export function canSeeGraph(_role: Role): boolean {
  return true;
}

export function visibleAreasFor(role: Role, areaId: string | null): "all" | string[] {
  if (role === "executive" || role === "admin") {
    return "all";
  }
  if (role === "manager" && areaId) {
    return [areaId];
  }
  return [];
}

export function canOpenIndicator(
  role: Role,
  areaId: string | null,
  indicatorAreaId: string | null
): boolean {
  if (role === "executive" || role === "admin") {
    return true;
  }
  if (role === "manager") {
    return areaId !== null && areaId === indicatorAreaId;
  }
  return false;
}

export function canWrite(role: Role): boolean {
  return role === "manager" || role === "admin";
}

interface AreaLike {
  id: string;
  name: string;
}

export function profileLabelFor(area: AreaLike): string {
  return `${area.name} Manager`;
}

export function startPageFor(role: Role): string {
  if (role === "manager") {
    return "/area";
  }
  if (role === "executive" || role === "admin") {
    return "/executive";
  }
  return "/";
}
