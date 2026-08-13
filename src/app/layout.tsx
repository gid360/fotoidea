import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { ShellLayout } from "@/components/layout/ShellLayout";
import { prisma } from "@/lib/prisma";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Fotoidea CRM",
  description: "CRM система для управления фотостудией Fotoidea",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoSetting = await prisma.setting.findUnique({ where: { key: "logoUrl" } }).catch(() => null);
  const logoUrl = logoSetting?.value || null;

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {logoUrl && <link rel="icon" href={logoUrl} />}
      </head>
      <body className={inter.className}>
        <Providers>
          <ShellLayout>{children}</ShellLayout>
        </Providers>
      </body>
    </html>
  );
}
