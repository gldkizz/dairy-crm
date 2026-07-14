"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Factory,
  Flame,
  LayoutDashboard,
  LogOut,
  Snowflake,
  SunMedium,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/button";

const salesLinks = [
  { href: "/sales/cold", label: "Холодные", icon: Snowflake },
  { href: "/sales/warm", label: "Теплые", icon: SunMedium },
  { href: "/sales/hot", label: "Горячие", icon: Flame },
];

type SidebarProps = {
  userName: string;
};

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Dairy CRM
        </p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Молочные продажи</h1>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
        <div>
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              pathname === "/"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Продажа
          </p>
          <div className="space-y-1">
            {salesLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Закупка
          </p>
          <Link
            href="/purchase"
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              pathname.startsWith("/purchase") || pathname.startsWith("/factories")
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <Factory className="h-4 w-4" />
            Заводы
          </Link>
        </div>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <p className="mb-2 truncate px-2 text-sm font-medium text-slate-700">
          {userName}
        </p>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className="w-full justify-start">
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </form>
      </div>
    </aside>
  );
}
