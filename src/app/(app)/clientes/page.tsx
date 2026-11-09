import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { formatarDocumento, somenteDigitos } from "@/lib/clients/documento";

type SearchParams = Promise<{ q?: string; salvo?: string }>;

export default function ClientesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando clientes…</p>}>
      <ClientesList searchParams={searchParams} />
    </Suspense>
  );
}

async function ClientesList({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { q = "", salvo } = await searchParams;
  const user = await requirePermission("clientes:ler");
  const podeEscrever = can(user.role, "clientes:escrever");

  const termo = q.trim().replace(/[%_,()*\\]/g, "");
  const digitos = somenteDigitos(q);

  const supabase = await createClient();
  const base = supabase
    .from("clients")
    .select("id, tipo, nome, cpf_cnpj, email, telefone");
  const filtrada = !termo
    ? base
    : digitos
      ? base.or(`nome.ilike.%${termo}%,cpf_cnpj.ilike.%${digitos}%`)
      : base.ilike("nome", `%${termo}%`);
  const { data: clientes, error } = await filtrada.order("nome").limit(200);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Pessoas físicas e jurídicas do escritório.</p>
        </div>
        {podeEscrever && (
          <Link
            href="/clientes/novo"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Novo cliente
          </Link>
        )}
      </div>

      {salvo === "1" && (
        <p role="status" className="mt-4 text-sm text-green-700">
          Cliente salvo com sucesso.
        </p>
      )}

      <form className="mt-6">
        <label htmlFor="q" className="sr-only">
          Buscar por nome ou CPF/CNPJ
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou CPF/CNPJ"
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </form>

      {error ? (
        <p className="mt-6 text-sm text-red-600">Não foi possível carregar os clientes.</p>
      ) : !clientes || clientes.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          {termo ? "Nenhum cliente encontrado para a busca." : "Nenhum cliente cadastrado ainda."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">CPF / CNPJ</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{cliente.nome}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {cliente.tipo === "pf" ? "Física" : "Jurídica"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatarDocumento(cliente.cpf_cnpj)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{cliente.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{cliente.telefone ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="text-slate-700 underline hover:text-slate-900"
                    >
                      {podeEscrever ? "Editar" : "Ver"}
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
