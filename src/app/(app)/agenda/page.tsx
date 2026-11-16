import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { atualizarSituacaoEvento } from "@/app/(app)/agenda/actions";
import { ROTULOS_TIPO_EVENTO, type TipoEvento } from "@/lib/agenda/validation";
import { formatarData, hojeSaoPaulo } from "@/lib/prazos/validation";

type SearchParams = Promise<{ mes?: string; salvo?: string }>;

type Item = {
  id: string;
  data: string;
  horario: string | null;
  titulo: string;
  origem: "evento" | "prazo";
  tipo?: TipoEvento;
  local?: string | null;
  situacao: string;
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function mesValido(mes: string | undefined): string | null {
  if (!mes || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return null;
  return mes;
}

function deslocarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(ano, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando agenda…</p>}>
      <AgendaMensal searchParams={searchParams} />
    </Suspense>
  );
}

async function AgendaMensal({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { mes: mesParam, salvo } = await searchParams;
  const user = await requireUser();
  const podeEscrever = can(user.role, "agenda:escrever");

  const hoje = hojeSaoPaulo();
  const mes = mesValido(mesParam) ?? hoje.slice(0, 7);
  const [ano, numeroMes] = mes.split("-").map(Number);
  const inicio = `${mes}-01`;
  const diasNoMes = new Date(Date.UTC(ano, numeroMes, 0)).getUTCDate();
  const fim = `${mes}-${String(diasNoMes).padStart(2, "0")}`;

  const supabase = await createClient();
  const [{ data: eventos, error: erroEventos }, { data: prazos, error: erroPrazos }] = await Promise.all([
    supabase
      .from("agenda_events")
      .select("id, titulo, tipo, data, horario, local, situacao")
      .gte("data", inicio)
      .lte("data", fim)
      .neq("situacao", "cancelado")
      .order("horario", { ascending: true, nullsFirst: true })
      .limit(1000),
    supabase
      .from("deadlines")
      .select("id, descricao, vencimento_confirmado, situacao")
      .in("situacao", ["confirmado", "cumprido"])
      .gte("vencimento_confirmado", inicio)
      .lte("vencimento_confirmado", fim)
      .limit(1000),
  ]);

  const itens: Item[] = [
    ...((eventos ?? []) as {
      id: string; titulo: string; tipo: TipoEvento; data: string; horario: string | null; local: string | null; situacao: string;
    }[]).map((e) => ({
      id: e.id,
      data: e.data,
      horario: e.horario,
      titulo: e.titulo,
      origem: "evento" as const,
      tipo: e.tipo,
      local: e.local,
      situacao: e.situacao,
    })),
    ...((prazos ?? []) as { id: string; descricao: string; vencimento_confirmado: string; situacao: string }[]).map((p) => ({
      id: p.id,
      data: p.vencimento_confirmado,
      horario: null,
      titulo: p.descricao,
      origem: "prazo" as const,
      situacao: p.situacao,
    })),
  ].sort((a, b) => (a.horario ?? "").localeCompare(b.horario ?? ""));

  const porDia = new Map<string, Item[]>();
  for (const item of itens) {
    porDia.set(item.data, [...(porDia.get(item.data) ?? []), item]);
  }

  const celulas: (number | null)[] = [
    ...Array.from({ length: new Date(Date.UTC(ano, numeroMes - 1, 1)).getUTCDay() }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  const anterior = deslocarMes(mes, -1);
  const proximo = deslocarMes(mes, 1);
  const erro = erroEventos || erroPrazos;

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
          <p className="mt-1 text-sm text-slate-500">
            Audiências, reuniões, tarefas e prazos confirmados. Prazos aguardando confirmação não aparecem aqui.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {podeEscrever && (
            <Link
              href="/agenda/novo"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Novo compromisso
            </Link>
          )}
        </div>
      </div>

      {salvo && <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Compromisso salvo.</p>}

      <div className="mt-6 flex items-center gap-3">
        <Link href={`/agenda?mes=${anterior}`} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          ← Anterior
        </Link>
        <h2 className="min-w-44 text-center text-lg font-semibold text-slate-900">
          {NOMES_MESES[numeroMes - 1]} de {ano}
        </h2>
        <Link href={`/agenda?mes=${proximo}`} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Próximo →
        </Link>
        <Link href="/agenda" className="ml-2 text-sm text-slate-600 underline hover:text-slate-900">
          Hoje
        </Link>
      </div>

      {erro ? (
        <p className="mt-6 text-sm text-red-600">Não foi possível carregar a agenda.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm">
          <div className="grid min-w-[700px] grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-600">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid min-w-[700px] grid-cols-7">
            {celulas.map((dia, indice) => {
              if (dia === null) {
                return <div key={`vazio-${indice}`} className="min-h-28 border-b border-r border-slate-100 bg-slate-50/50" />;
              }
              const iso = `${mes}-${String(dia).padStart(2, "0")}`;
              const doDia = porDia.get(iso) ?? [];
              const ehHoje = iso === hoje;
              return (
                <div key={iso} className="min-h-28 border-b border-r border-slate-100 p-2">
                  <p className={`text-xs font-medium ${ehHoje ? "text-blue-700" : "text-slate-500"}`}>
                    {ehHoje ? <span className="rounded bg-blue-600 px-1.5 py-0.5 text-white">{dia}</span> : dia}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {doDia.slice(0, 3).map((item) => (
                      <li
                        key={`${item.origem}-${item.id}`}
                        className={`truncate rounded px-1.5 py-0.5 text-xs ${
                          item.origem === "prazo" ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"
                        } ${item.situacao === "realizado" || item.situacao === "cumprido" ? "opacity-60" : ""}`}
                        title={item.titulo}
                      >
                        {item.origem === "prazo" ? (
                          <Link href={`/prazos/${item.id}`}>Prazo: {item.titulo}</Link>
                        ) : (
                          <span>
                            {item.horario ? `${item.horario.slice(0, 5)} ` : ""}
                            {item.titulo}
                          </span>
                        )}
                      </li>
                    ))}
                    {doDia.length > 3 && <li className="text-xs text-slate-500">+{doDia.length - 3} item(ns)</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!erro && itens.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">Lista do mês</h2>
          <div className="mt-3 overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Horário</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  {podeEscrever && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map((item) => (
                  <tr key={`${item.origem}-${item.id}`}>
                    <td className="px-4 py-3 text-slate-900">{formatarData(item.data)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.horario ? item.horario.slice(0, 5) : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.origem === "prazo" ? "Prazo" : ROTULOS_TIPO_EVENTO[item.tipo!]}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {item.origem === "prazo" ? <Link href={`/prazos/${item.id}`} className="underline">{item.titulo}</Link> : item.titulo}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.local ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.situacao}</td>
                    {podeEscrever && (
                      <td className="px-4 py-3 text-right">
                        {item.origem === "evento" && item.situacao === "agendado" && (
                          <div className="flex justify-end gap-2">
                            <form action={atualizarSituacaoEvento}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="mes" value={mes} />
                              <input type="hidden" name="situacao" value="realizado" />
                              <button className="text-emerald-700 underline hover:text-emerald-900">Realizado</button>
                            </form>
                            <form action={atualizarSituacaoEvento}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="mes" value={mes} />
                              <input type="hidden" name="situacao" value="cancelado" />
                              <button className="text-red-700 underline hover:text-red-900">Cancelar</button>
                            </form>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
