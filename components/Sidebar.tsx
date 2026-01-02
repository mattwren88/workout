"use client";

import { NavLink } from "@/components/NavLink";

export const Sidebar = () => {
  return (
    <aside className="flex h-full flex-col gap-6 rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-soft backdrop-blur">
      <div>
        <p className="font-heading text-lg font-semibold">Cadence</p>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Training HQ</p>
      </div>
      <nav className="flex flex-col gap-2">
        <NavLink href="/" label="Overview" />
        <NavLink href="/log" label="Quick Log" />
        <NavLink href="/sessions" label="Sessions" />
        <NavLink href="/import" label="Import CSV" />
        <NavLink href="/dashboard/strength" label="Strength Dashboard" />
        <NavLink href="/dashboard/cycling" label="Cycling Dashboard" />
        <NavLink href="/plan" label="Week Plan" />
        <NavLink href="/settings" label="Settings" />
      </nav>
      <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        Lift first on double days. Keep hard rides to two per week.
      </div>
    </aside>
  );
};
