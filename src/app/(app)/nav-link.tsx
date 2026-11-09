"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  const pathname = usePathname();
  const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        ativo
          ? "bg-blue-600/15 text-blue-400 ring-1 ring-blue-500/30"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
