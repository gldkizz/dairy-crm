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
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={session.user.name ?? session.user.email ?? "Менеджер"} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
