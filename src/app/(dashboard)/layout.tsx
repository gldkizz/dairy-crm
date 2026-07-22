import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { Sidebar } from "@/widgets/sidebar/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <Sidebar userName={session.user.name ?? session.user.email ?? "Менеджер"} />
      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
