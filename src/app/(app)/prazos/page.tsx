import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  diasAte,
  formatarData,
  hojeSaoPaulo,
  ROTULOS_SITUACAO_PRAZO,
  vencimentoEfetivo,
} from "@/lib/prazos/validation";

type SearchParams = Promise<{ situacao?: string }>;

type PrazoLinha = {
  id: string;
  descricao: string;
  vencimento_calculado: string;
  vencimento_confirmado: string | null;
  situacao: string;
  process_id: string | null;
  client_id: string | null;
};

export default function PrazosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando prazos…</p>}>
      <PrazosList searchParams={searchParams} />
    </Suspense>
  );
}

async function PrazosList({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { situacao = "" } = await searchParams;
  const user = await requireUser();
  const podeEscrever = can(user.role, "prazos:escrever");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deadlines")
    .select("id, descricao, vencimento_calculado, vencimento_confirmado, situacao, process_id, client_id")
    .in("situacao", ["pendente", "confirmado"])
    .order("vencimento_calculado", { ascending: true })
    .limit(500);

  const hoje = hojeSaoPaulo();
  const ativos = ((data ?? []) as PrazoLinha[])
    .map((p) => ({ ...p, vencimento: vencimentoEfetivo(p), dias: diasAte(vencimentoEfetivo(p), hoje) }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const filtrados = ativos.filter((p) => !situacao || p.situacao === situacao);
  const alertas = {
    vencidos: ativos.filter((p) => p.situacao === "confirmado" && p.dias < 0),
    proximos: ativos.filter((p) => p.situacao === "confirmado" && p.dias >= 0 && p.dias <= 7),
    aConfirmar: ativos.filter((p) => p.situacao === "pendente"),
  };

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Prazos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Prazos processuais. Dias úteis seguem o CPC; feriados estaduais e municipais devem ser conferidos.
          </p>
        </div>
        {podeEscrever && (
          <Link
            href="/prazos/novo"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Novo prazo
          </Link>
        )}
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Indicador titulo="Vencidos" valor={alertas.vencidos.length} tom="red" />
        <Indicador titulo="Vencem em até 7 dias" valor={alertas.proximos.length} tom="amber" />
        <Indicador titulo="Aguardando confirmação" valor={alertas.aConfirmar.length} tom="blue" />
      </section>

      <form className="mt-6 flex items-end gap-3">
        <div>
          <label htmlFor="situacao" className="block text-sm font-medium text-slate-700">
            Situação
          </label>
          <select
            id="situacao"
            name="situacao"
            defaultValue={situacao}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas em aberto</option>
            <option value="pendente">{ROTULOS_SITUACAO_PRAZO.pendente}</option>
            <option value="confirmado">{ROTULOS_SITUACAO_PRAZO.confirmado}</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Filtrar
        </button>
      </form>

      {error ? (
        <p className="mt-6 text-sm text-red-600">Não foi possível carregar os prazos.</p>
      ) : filtrados.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Nenhum prazo em aberto.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium">Status do prazo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatarData(p.vencimento)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.descricao}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {ROTULOS_SITUACAO_PRAZO[p.situacao as keyof typeof ROTULOS_SITUACAO_PRAZO]}
                  </td>
                  <td className="px-4 py-3">
                    <Status dias={p.dias} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/prazos/${p.id}`} className="text-slate-700 underline hover:text-slate-900">
                      {podeEscrever ? "Abrir" : "Ver"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const TONS = {
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
} as const;

function Indicador({ titulo, valor, tom }: { titulo: string; valor: number; tom: keyof typeof TONS }) {
  return (
    <div className={`rounded-xl p-5 ring-1 ${TONS[tom]}`}>
      <p className="text-sm font-medium">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold">{valor}</p>
    </div>
  );
}

function Status({ dias }: { dias: number }) {
  if (dias < 0) return <span className="text-red-700">Vencido há {Math.abs(dias)} dia(s)</span>;
  if (dias === 0) return <span className="font-medium text-red-700">Vence hoje</span>;
  if (dias <= 7) return <span className="text-amber-700">Vence em {dias} dia(s)</span>;
  return <span className="text-slate-500">Em {dias} dia(s)</span>;
}
