"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition",
        isActive
          ? "bg-ink text-white shadow-soft"
          : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <span>{label}</span>
    </Link>
  );
};
