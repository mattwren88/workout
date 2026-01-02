import { Sidebar } from "@/components/Sidebar";
import { UnitToggle } from "@/components/UnitToggle";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="app-bg min-h-screen px-4 py-6 text-slate-900">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[240px_1fr]">
        <Sidebar />
        <div className="flex flex-col gap-6">
          <header className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white/80 px-6 py-4 shadow-soft backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Cycling + Strength</p>
              <h1 className="font-heading text-2xl font-semibold">Progress + Consistency</h1>
            </div>
            <UnitToggle />
          </header>
          <main className="flex flex-col gap-6">{children}</main>
        </div>
      </div>
    </div>
  );
};
