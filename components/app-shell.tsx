"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  FilePenLine,
  Home,
  Lightbulb,
  ListPlus,
  Menu,
  Settings,
  Trash2,
  Workflow
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/timeline", label: "Timeline", icon: Workflow },
  { href: "/logs", label: "Logs", icon: BarChart3 },
  { href: "/logs?mode=create", label: "Add Log", icon: ListPlus, child: true },
  { href: "/logs?mode=delete", label: "Delete Log", icon: Trash2, child: true },
  { href: "/logs?mode=update", label: "Update Log", icon: FilePenLine, child: true },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/settings", label: "Settings", icon: Settings }
];

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-white/10 bg-slate-950/70 p-3 backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-cyan-300 text-sm font-black text-slate-950">
              DL
            </span>
            {!collapsed && (
              <span className="truncate text-sm font-semibold leading-5 text-white">
                Distributed Logs
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
            aria-label="Collapse sidebar"
          >
            {collapsed ? <Menu size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0]);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                  item.child && !collapsed ? "ml-4" : ""
                } ${
                  active && !item.child
                    ? "bg-cyan-300 text-slate-950 shadow-glow"
                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={18} aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/55 px-4 py-3 backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-md bg-cyan-300 text-xs font-black text-slate-950">
              DL
            </span>
            <span className="text-sm font-semibold text-white">Distributed Logs</span>
          </div>
          <div className="hidden text-sm text-slate-400 lg:block">
            Reconcile distributed events with confidence-scored causality.
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="h-10 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
