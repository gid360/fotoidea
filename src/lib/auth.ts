import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email?: string | null;
      role: UserRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        login: { label: "Номер телефона", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.login || !credentials?.password) return null;

          const loginInput = (credentials.login as string).trim();
          const password = credentials.password as string;
          const normalizedPhone = normalizePhone(loginInput);

          const user = await prisma.user.findFirst({
            where: {
              isActive: true,
              OR: [
                { phone: loginInput },
                { phone: normalizedPhone },
                { email: loginInput.toLowerCase() },
              ],
            },
          });

          if (!user || !user.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email ?? null,
            role: user.role,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
