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
          const rawDigits = loginInput.replace(/\D/g, "");

          const phoneVariants: string[] = [loginInput];

          if (rawDigits.length >= 10) {
            const tenDigits =
              rawDigits.length === 11 && (rawDigits.startsWith("7") || rawDigits.startsWith("8"))
                ? rawDigits.slice(1)
                : rawDigits.slice(-10);

            phoneVariants.push(
              `+7${tenDigits}`,
              `8${tenDigits}`,
              `7${tenDigits}`,
              tenDigits,
              `+7 ${tenDigits.slice(0, 3)} ${tenDigits.slice(3, 6)} ${tenDigits.slice(6, 8)} ${tenDigits.slice(8)}`,
              `+7 ${tenDigits.slice(0, 3)} ${tenDigits.slice(3, 6)} ${tenDigits.slice(6)}`,
              `8 ${tenDigits.slice(0, 3)} ${tenDigits.slice(3, 6)} ${tenDigits.slice(6, 8)} ${tenDigits.slice(8)}`,
              `8 ${tenDigits.slice(0, 3)} ${tenDigits.slice(3, 6)} ${tenDigits.slice(6)}`,
              `+7 (${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6, 8)}-${tenDigits.slice(8)}`,
              `8 (${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6, 8)}-${tenDigits.slice(8)}`
            );
          }

          const uniqueVariants = Array.from(new Set(phoneVariants));

          const user = await prisma.user.findFirst({
            where: {
              isActive: true,
              OR: [
                ...uniqueVariants.map((p) => ({ phone: p })),
                { email: loginInput.toLowerCase() },
              ],
            },
            orderBy: [
              { role: "asc" },
            ],
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
