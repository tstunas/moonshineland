import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { PerformanceMeasureGuard } from "@/components/PerformanceMeasureGuard";
import { PreferencesCssApplier } from "@/components/PreferencesCssApplier";
import { Toaster } from "@/components/ui/Toaster";
import { getCurrentUser } from "@/features/auth/queries";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const picsLabelAddress = process.env.PICS_LABEL_ADDRESS ?? "주소";
const picsLabelContent = `(PICS-1.1 'http://service.kocsc.or.kr/rating.html' | gentrue for '${picsLabelAddress}' r (y 1))`;

export const metadata: Metadata = {
  title: {
    default: "문샤인랜드",
    template: "%s",
  },
  description: "문샤인랜드는 AA연재를 위한 사이트입니다.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden antialiased`}
    >
      <head>
        <meta httpEquiv="PICS-label" content={picsLabelContent} />
      </head>
      <body className="h-full overflow-hidden bg-slate-300 text-slate-900">
        <PerformanceMeasureGuard />
        <PreferencesCssApplier />
        <AppShell
          isAuthenticated={Boolean(currentUser)}
          isAdmin={Boolean(currentUser?.isAdmin)}
        >
          {children}
        </AppShell>
        <Toaster />
      </body>
    </html>
  );
}
