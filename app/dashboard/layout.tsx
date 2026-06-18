import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LanguageProvider } from "./LanguageContext";
import { SidebarProvider } from "./SidebarContext";
import { DashboardSidebar } from "./DashboardSidebar";
import { MaintenanceBanner } from "./MaintenanceBanner";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <LanguageProvider>
      <SidebarProvider>
        <div className="flex flex-col lg:flex-row min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0a0a1a 0%, #000000 70%)" }}>
          <Suspense fallback={null}>
            <DashboardSidebar />
          </Suspense>
          <div className="flex-1 min-w-0">
            <MaintenanceBanner />
            {children}
          </div>
        </div>
      </SidebarProvider>
    </LanguageProvider>
  );
}
