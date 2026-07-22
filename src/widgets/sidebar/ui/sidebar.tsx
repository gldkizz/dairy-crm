"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Factory,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Snowflake,
  SunMedium,
  X,
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

function SidebarNav({
  userName,
  onNavigate,
}: {
  userName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Dairy CRM
        </p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">
          Молочные продажи
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
        <div>
          <Link
            href="/"
            onClick={onNavigate}
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
                  onClick={onNavigate}
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
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              pathname.startsWith("/purchase") ||
                pathname.startsWith("/factories")
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
    </>
  );
}

export function Sidebar({ userName }: SidebarProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Открыть меню"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Dairy CRM
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">
            Молочные продажи
          </p>
        </div>
      </header>

      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur md:flex">
        <SidebarNav userName={userName} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Закрыть меню"
          className={cn(
            "absolute inset-0 bg-slate-900/30 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Навигация"
          className={cn(
            "absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="absolute right-2 top-2 z-10 md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SidebarNav userName={userName} onNavigate={() => setOpen(false)} />
        </aside>
      </div>
    </>
  );
}
