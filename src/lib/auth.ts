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
          const rawDigits = loginInput.replace(/\D/g, "");
          const formattedPhone1 = rawDigits.length === 11 ? `+7 ${rawDigits.slice(1, 4)} ${rawDigits.slice(4, 7)} ${rawDigits.slice(7, 9)} ${rawDigits.slice(9)}` : null;
          const formattedPhone2 = rawDigits.length === 11 ? `+7 (${rawDigits.slice(1, 4)}) ${rawDigits.slice(4, 7)}-${rawDigits.slice(7, 9)}-${rawDigits.slice(9)}` : null;
          const formattedPhone3 = rawDigits.length === 11 ? `+7 ${rawDigits.slice(1, 4)} ${rawDigits.slice(4, 7)} ${rawDigits.slice(7)}` : null;

          const user = await prisma.user.findFirst({
            where: {
              isActive: true,
              OR: [
                { phone: loginInput },
                { phone: normalizedPhone },
                { phone: rawDigits },
                ...(formattedPhone1 ? [{ phone: formattedPhone1 }] : []),
                ...(formattedPhone2 ? [{ phone: formattedPhone2 }] : []),
                ...(formattedPhone3 ? [{ phone: formattedPhone3 }] : []),
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
