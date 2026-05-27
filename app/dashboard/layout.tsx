import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LanguageProvider } from "./LanguageContext";
import { DashboardSidebar } from "./DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <LanguageProvider>
      <div style={{ display: "flex", minHeight: "100vh", background: "#000000" }}>
        <Suspense fallback={null}>
          <DashboardSidebar />
        </Suspense>
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </LanguageProvider>
  );
}
