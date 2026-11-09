import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  ROTULOS_GRAU,
  ROTULOS_SITUACAO,
  SITUACOES,
  GRAUS,
} from "@/lib/processos/validation";

type SearchParams = Promise<{ q?: string; situacao?: string; grau?: string }>;

export default function ProcessosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando processos…</p>}>
      <ProcessosList searchParams={searchParams} />
    </Suspense>
  );
}

async function ProcessosList({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { q = "", situacao = "", grau = "" } = await searchParams;
  const user = await requireUser();
  const podeEscrever = can(user.role, "processos:escrever");

  const termo = q.trim().replace(/[%_,()*\\]/g, "");
  const supabase = await createClient();

  let idsPorCliente: string[] = [];
  if (termo) {
    const { data: clientes } = await supabase
      .from("clients")
      .select("id")
      .ilike("nome", `%${termo}%`)
      .limit(100);
    const clienteIds = (clientes ?? []).map((c) => c.id);
    if (clienteIds.length > 0) {
      const { data: vinculos } = await supabase
        .from("process_clients")
        .select("process_id")
        .in("client_id", clienteIds)
        .limit(500);
      idsPorCliente = (vinculos ?? []).map((v) => v.process_id);
    }
  }

  let consulta = supabase
    .from("processes")
    .select("id, numero_cnj, tribunal, grau, assunto, parte_autora, parte_re, situacao, fase")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (termo) {
    const condicoes = [
      `numero_cnj.ilike.%${termo}%`,
      `assunto.ilike.%${termo}%`,
      `parte_autora.ilike.%${termo}%`,
      `parte_re.ilike.%${termo}%`,
    ];
    if (idsPorCliente.length > 0) {
      condicoes.push(`id.in.(${idsPorCliente.join(",")})`);
    }
    consulta = consulta.or(condicoes.join(","));
  }
  if ((SITUACOES as readonly string[]).includes(situacao)) {
    consulta = consulta.eq("situacao", situacao);
  }
  if ((GRAUS as readonly string[]).includes(grau)) {
    consulta = consulta.eq("grau", grau);
  }

  const { data: processos, error } = await consulta;
  const filtrado = Boolean(termo || situacao || grau);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Processos</h1>
          <p className="mt-1 text-sm text-slate-500">Processos judiciais e administrativos do escritório.</p>
        </div>
        {podeEscrever && (
          <Link
            href="/processos/novo"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Novo processo
          </Link>
        )}
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-sm font-medium text-slate-700">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="CNJ, assunto, parte ou nome do cliente"
            className="mt-1 w-80 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
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
            <option value="">Todas</option>
            {SITUACOES.map((s) => (
              <option key={s} value={s}>
                {ROTULOS_SITUACAO[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="grau" className="block text-sm font-medium text-slate-700">
            Grau
          </label>
          <select
            id="grau"
            name="grau"
            defaultValue={grau}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {GRAUS.map((g) => (
              <option key={g} value={g}>
                {ROTULOS_GRAU[g]}
              </option>
            ))}
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
        <p className="mt-6 text-sm text-red-600">Não foi possível carregar os processos.</p>
      ) : !processos || processos.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          {filtrado ? "Nenhum processo encontrado para os filtros." : "Nenhum processo cadastrado ainda."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Assunto</th>
                <th className="px-4 py-3 font-medium">Partes</th>
                <th className="px-4 py-3 font-medium">Grau</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processos.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.numero_cnj ?? "Sem número CNJ"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.assunto ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[p.parte_autora, p.parte_re].filter(Boolean).join(" x ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.grau ? ROTULOS_GRAU[p.grau as keyof typeof ROTULOS_GRAU] : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{ROTULOS_SITUACAO[p.situacao as keyof typeof ROTULOS_SITUACAO]}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/processos/${p.id}`} className="text-slate-700 underline hover:text-slate-900">
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
