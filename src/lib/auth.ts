import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import type { Permissions } from "@/lib/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email },
          include: {
            role: { select: { id: true, name: true, permissions: true } },
            employee: { select: { id: true, status: true } },
          },
        });

        if (!user || !user.active) return null;
        if (user.employee && user.employee.status === "INACTIVE") return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: user.role.id,
          role: user.role.name,
          permissions: (user.role.permissions ?? {}) as Permissions,
          employeeId: user.employee?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      if (token.sub) {
        const user = await db.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            employeeId: true,
            role: { select: { id: true, name: true, permissions: true } },
          },
        });

        if (!user || !user.active) {
          token.revoked = true;
          return token;
        }

        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.roleId = user.role.id;
        token.role = user.role.name;
        token.permissions = (user.role.permissions ?? {}) as Permissions;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.revoked) {
        return session;
      }
      session.user.id = token.id ?? session.user.id;
      session.user.name = token.name ?? session.user.name;
      session.user.email = token.email ?? session.user.email;
      session.user.roleId = token.roleId;
      session.user.role = token.role;
      session.user.permissions = token.permissions;
      session.user.employeeId = token.employeeId ?? null;
      return session;
    },
  },
});
