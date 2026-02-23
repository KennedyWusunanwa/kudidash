import type { Role } from "@/types/accounting";

export type Permission =
  | "org.manage"
  | "org.members.manage"
  | "coa.manage"
  | "journals.create"
  | "journals.approve"
  | "journals.post"
  | "journals.reverse"
  | "sales.manage"
  | "purchases.manage"
  | "banking.manage"
  | "reports.view";

const PERMISSIONS_BY_ROLE: Record<Role, Set<Permission>> = {
  owner: new Set<Permission>([
    "org.manage",
    "org.members.manage",
    "coa.manage",
    "journals.create",
    "journals.approve",
    "journals.post",
    "journals.reverse",
    "sales.manage",
    "purchases.manage",
    "banking.manage",
    "reports.view",
  ]),
  admin: new Set<Permission>([
    "org.manage",
    "org.members.manage",
    "coa.manage",
    "journals.create",
    "journals.approve",
    "journals.post",
    "sales.manage",
    "purchases.manage",
    "banking.manage",
    "reports.view",
  ]),
  accountant: new Set<Permission>([
    "coa.manage",
    "journals.create",
    "sales.manage",
    "purchases.manage",
    "banking.manage",
    "reports.view",
  ]),
  approver: new Set<Permission>([
    "journals.approve",
    "journals.post",
    "reports.view",
  ]),
  viewer: new Set<Permission>(["reports.view"]),
};

export function roleHasPermission(role: Role, permission: Permission) {
  return PERMISSIONS_BY_ROLE[role].has(permission);
}
