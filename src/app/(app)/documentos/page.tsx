import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS, ROTULOS_CATEGORIA, type Categoria } from "@/lib/documentos/validation";

type SearchParams = Promise<{ q?: string; categoria?: string; enviados?: string; excluido?: string }>;

export default function DocumentosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando documentos…</p>}>
      <DocumentosList searchParams={searchParams} />
    </Suspense>
  );
}

async function DocumentosList({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { q = "", categoria = "", enviados, excluido } = await searchParams;
  const user = await requirePermission("documentos:ler");
  const podeEscrever = can(user.role, "documentos:escrever");

  const termo = q.replace(/[,()%*]/g, "").trim();
  const filtroCategoria = (CATEGORIAS as readonly string[]).includes(categoria) ? categoria : "";

  const supabase = await createClient();
  let consulta = supabase
    .from("documents")
    .select("id, nome, categoria, nome_original, tags, data_documento, tamanho_bytes, clients(nome)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,descricao.ilike.%${termo}%`);
  if (filtroCategoria) consulta = consulta.eq("categoria", filtroCategoria);

  const { data: documentos, error } = await consulta;

  type Linha = {
    id: string;
    nome: string;
    categoria: string;
    nome_original: string;
    tags: string[] | null;
    data_documento: string | null;
    tamanho_bytes: number;
    clients: { nome: string } | null;
  };
  const lista = (documentos ?? []) as unknown as Linha[];

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documentos</h1>
          <p className="mt-1 text-sm text-slate-500">Arquivos do escritório, organizados por categoria.</p>
        </div>
        {podeEscrever && (
          <Link
            href="/documentos/novo"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Novo documento
          </Link>
        )}
      </div>

      {enviados && (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          {enviados} documento(s) enviado(s).
        </p>
      )}
      {excluido && (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          Documento excluído.
        </p>
      )}

      <form className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou descrição"
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="categoria"
          defaultValue={filtroCategoria}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {ROTULOS_CATEGORIA[c]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          Filtrar
        </button>
      </form>

      {error && <p className="mt-6 text-sm text-red-600">Não foi possível carregar os documentos.</p>}

      {!error && lista.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">Nenhum documento encontrado.</p>
      )}

      {lista.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tamanho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/documentos/${d.id}`} className="font-medium text-slate-900 underline">
                      {d.nome}
                    </Link>
                    {d.tags && d.tags.length > 0 && (
                      <span className="ml-2 text-xs text-slate-500">{d.tags.join(", ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ROTULOS_CATEGORIA[d.categoria as Categoria] ?? d.categoria}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{d.clients?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.data_documento
                      ? new Date(`${d.data_documento}T00:00:00`).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {(Number(d.tamanho_bytes) / (1024 * 1024)).toFixed(2).replace(".", ",")} MB
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
