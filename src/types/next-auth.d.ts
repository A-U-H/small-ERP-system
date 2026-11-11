import type { DefaultSession } from "next-auth";
import type { Access, Module, Permissions } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: string;
      role: string;
      permissions: Permissions;
      employeeId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    roleId: string;
    role: string;
    permissions: Permissions;
    employeeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleId: string;
    role: string;
    permissions: Permissions;
    employeeId: string | null;
    revoked?: boolean;
  }
}

declare module "next-auth/core/types" {
  interface AdapterUser {
    roleId: string;
    role: string;
    permissions: Permissions;
    employeeId: string | null;
  }
}

export type { Access, Module, Permissions };
