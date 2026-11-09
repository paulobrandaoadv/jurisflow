import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarClock, Gavel, FileText, Users, Landmark, Newspaper } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROTULOS_GRAU, ROTULOS_SITUACAO } from "@/lib/processos/validation";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando indicadores…</p>}>
      <DashboardContent />
    </Suspense>
  );
}

const DATA_FORMATADA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

async function DashboardContent() {
  await connection();
  const user = await requireUser();
  const supabase = await createClient();

  const [clientes, processos, documentos, recentes] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("processes").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("processes")
      .select("id, numero_cnj, assunto, grau, situacao, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const primeiroNome = user.name.split(" ")[0];
  const indicadores = [
    { label: "Clientes cadastrados", valor: clientes, icon: Users, cor: "text-blue-400 bg-blue-500/15" },
    { label: "Processos", valor: processos, icon: Gavel, cor: "text-violet-400 bg-violet-500/15" },
    { label: "Documentos", valor: documentos, icon: FileText, cor: "text-emerald-400 bg-emerald-500/15" },
  ];

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Olá, {primeiroNome}!</h1>
          <p className="mt-1 text-sm text-slate-400">Aqui está um resumo da sua atividade jurídica.</p>
        </div>
        <p className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 capitalize">
          {DATA_FORMATADA.format(new Date())}
        </p>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {indicadores.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/5 bg-[#111a2e] p-5">
            <div className="flex items-center gap-4">
              <span className={`flex size-11 items-center justify-center rounded-lg ${item.cor}`}>
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {item.valor.error ? "—" : (item.valor.count ?? 0)}
                </p>
              </div>
            </div>
            {item.valor.error && (
              <p className="mt-2 text-xs text-red-400">Não foi possível carregar.</p>
            )}
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-[#111a2e] xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h2 className="font-semibold text-white">Processos recentes</h2>
            <Link href="/processos" className="text-sm text-blue-400 hover:text-blue-300">
              Ver todos →
            </Link>
          </div>
          {recentes.error ? (
            <p className="px-5 py-6 text-sm text-red-400">Não foi possível carregar os processos.</p>
          ) : !recentes.data || recentes.data.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">Nenhum processo cadastrado ainda.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentes.data.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/processos/${p.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {p.numero_cnj ?? "Sem número CNJ"}
                      </p>
                      <p className="truncate text-xs text-slate-500">{p.assunto ?? "Sem assunto"}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-400">
                      <p>{p.grau ? ROTULOS_GRAU[p.grau as keyof typeof ROTULOS_GRAU] : "—"}</p>
                      <p className="text-slate-500">
                        {ROTULOS_SITUACAO[p.situacao as keyof typeof ROTULOS_SITUACAO]}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {[
            { titulo: "Prazos próximos", etapa: "Etapa 4", icon: CalendarClock },
            { titulo: "Integração eproc", etapa: "Etapa 4", icon: Landmark },
            { titulo: "Diário Oficial", etapa: "Etapa 4", icon: Newspaper },
          ].map((bloco) => (
            <div
              key={bloco.titulo}
              className="flex items-center gap-4 rounded-xl border border-dashed border-white/10 bg-[#111a2e]/60 p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-white/5 text-slate-500">
                <bloco.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="font-medium text-slate-300">{bloco.titulo}</p>
                <p className="text-xs text-slate-500">Em breve ({bloco.etapa})</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
