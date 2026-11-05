export const MODULES = [
  "dashboard",
  "crm",
  "projects",
  "team",
  "finance",
  "settings",
] as const;

export type Module = (typeof MODULES)[number];

export type Access = "none" | "view" | "edit";

export type Permissions = Partial<Record<Module, Access>>;

export const ACCESS_RANK: Record<Access, number> = {
  none: 0,
  view: 1,
  edit: 2,
};

export const ADMIN_ROLE = "Admin";

export interface RoleLike {
  name: string;
  permissions: Permissions | unknown;
}

/**
 * Check whether a role has at least `needed` access on a module.
 * Admin always has full access.
 */
export function hasAccess(
  role: RoleLike | null | undefined,
  module: Module,
  needed: "view" | "edit" = "view",
): boolean {
  if (!role) return false;
  if (role.name === ADMIN_ROLE) return true;

  const perms = (role.permissions ?? {}) as Permissions;
  const level = perms[module] ?? "none";
  return ACCESS_RANK[level] >= ACCESS_RANK[needed];
}

/** Default permissions for a fresh custom role: view on all modules except Settings. */
export function defaultPermissions(): Permissions {
  return {
    dashboard: "view",
    crm: "view",
    projects: "view",
    team: "view",
    finance: "view",
    settings: "none",
  };
}
