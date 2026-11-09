import { connection } from "next/server";
import { Suspense } from "react";
import {
  Bell,
  CalendarDays,
  ChartColumn,
  Clock,
  FileCheck,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Newspaper,
  Scale,
  Search,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { signOut } from "@/app/login/actions";
import { NavLink } from "./nav-link";

type MenuItem = { label: string; href: string; icon: LucideIcon; etapa?: string };

const MENU: MenuItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Processos", href: "/processos", icon: Gavel },
  { label: "Documentos", href: "/documentos", icon: FileText },
  { label: "Publicações e Intimações", href: "#", icon: Newspaper, etapa: "Etapa 4" },
  { label: "Prazos", href: "#", icon: Clock, etapa: "Etapa 4" },
  { label: "Agenda", href: "#", icon: CalendarDays, etapa: "Etapa 4" },
  { label: "Financeiro", href: "#", icon: Wallet, etapa: "Etapa 5" },
  { label: "Atendimentos", href: "#", icon: MessageSquare, etapa: "Etapa 5" },
  { label: "Gerador de Documentos", href: "#", icon: FileCheck, etapa: "Etapa 6" },
  { label: "Relatórios", href: "#", icon: ChartColumn, etapa: "Etapa 6" },
  { label: "Configurações", href: "#", icon: Settings, etapa: "Etapa 1" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Carregando…</div>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await requireUser();
  const iniciais = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]!.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-[#0a1020] text-slate-200">
        <div className="flex items-center gap-3 px-6 py-6">
          <Scale className="size-8 text-amber-400" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-white">
              Juris<span className="text-blue-400">Flow</span>
            </p>
            <p className="text-xs text-slate-500">Gestão jurídica</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {MENU.map((item) =>
            item.etapa ? (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600"
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                  {item.etapa}
                </span>
              </span>
            ) : (
              <NavLink key={item.label} href={item.href} label={item.label} icon={item.icon} />
            ),
          )}
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-semibold text-blue-300">
            {iniciais}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Sair"
              aria-label="Sair"
              className="rounded-md p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-white/5 bg-[#0d1528]/90 px-8 py-4 backdrop-blur">
          <form action="/busca" className="relative w-full max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              aria-label="Buscar"
              placeholder="Buscar processos, clientes ou documentos…"
              className="w-full rounded-lg border border-white/10 bg-[#0a1020] py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </form>
          <span
            className="ml-auto flex size-9 items-center justify-center rounded-lg text-slate-500"
            title="Notificações (em breve)"
            aria-label="Notificações (em breve)"
          >
            <Bell className="size-5" aria-hidden="true" />
          </span>
        </header>

        <div className="flex-1 p-8">{children}</div>
      </div>
    </div>
  );
}
