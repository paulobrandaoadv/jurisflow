import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { signOut } from "@/app/login/actions";

type MenuItem = { label: string; href: string; etapa?: string };

const MENU: MenuItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Clientes", href: "/clientes" },
  { label: "Busca", href: "/busca" },
  { label: "Processos", href: "/processos" },
  { label: "Documentos", href: "/documentos" },
  { label: "Publicações e Intimações", href: "#", etapa: "Etapa 4" },
  { label: "Prazos", href: "#", etapa: "Etapa 4" },
  { label: "Agenda", href: "#", etapa: "Etapa 4" },
  { label: "Financeiro", href: "#", etapa: "Etapa 5" },
  { label: "Atendimentos", href: "#", etapa: "Etapa 5" },
  { label: "Gerador de Documentos", href: "#", etapa: "Etapa 6" },
  { label: "Relatórios", href: "#", etapa: "Etapa 6" },
  { label: "Configurações", href: "#", etapa: "Etapa 1" },
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

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-64 flex-col bg-slate-900 text-slate-200">
        <div className="px-6 py-5 text-lg font-semibold text-white">JurisFlow</div>
        <nav className="flex-1 space-y-1 px-3">
          {MENU.map((item) =>
            item.etapa ? (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-500"
              >
                {item.label}
                <span className="text-xs">{item.etapa}</span>
              </span>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="border-t border-slate-800 px-6 py-4 text-sm">
          <p className="font-medium text-white">{user.name}</p>
          <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
          <form action={signOut} className="mt-3">
            <button type="submit" className="text-xs text-slate-400 underline hover:text-white">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
