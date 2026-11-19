"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "../auth/actions";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav";

type ShellProps = {
  items: NavItem[];
  email: string;
  roleLabel: string;
  children: React.ReactNode;
};

// Strip the internal "/admin" prefix in case the router reports the rewritten path.
const normalize = (pathname: string) => pathname.replace(/^\/admin(?=\/|$)/, "") || "/";

export function Shell({ items, email, roleLabel, children }: ShellProps) {
  const pathname = normalize(usePathname());
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const base =
          "flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-medium";
        if (item.soon) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className={cn(base, "cursor-not-allowed text-sand/45")}
            >
              {item.label}
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-gold">
                {item.soon}
              </span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={cn(base, active ? "bg-white/10 text-gold" : "text-sand/85 hover:bg-white/5")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 pt-4">
      <p className="truncate text-sm text-sand" title={email}>
        {email}
      </p>
      <p className="text-xs text-sand/55">{roleLabel}</p>
      <form action={signOut} className="mt-3">
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg border border-white/20 px-3 text-sm font-semibold text-sand hover:border-gold hover:text-gold"
        >
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between bg-ink px-4 py-6 md:flex">
        <div>
          <p className="mb-8 px-3 font-display text-2xl tracking-[0.3em] text-sand">ELZORA</p>
          {nav}
        </div>
        {account}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
        <p className="font-display text-xl tracking-[0.3em] text-sand">ELZORA</p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold text-sand"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>
      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] bottom-0 z-20 overflow-y-auto bg-ink px-4 py-4 md:hidden"
        >
          {nav}
          <div className="mt-6">{account}</div>
        </div>
      )}

      <main id="main" className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
