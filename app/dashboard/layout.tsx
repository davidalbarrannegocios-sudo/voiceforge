import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LanguageProvider } from "./LanguageContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <LanguageProvider>{children}</LanguageProvider>;
}
