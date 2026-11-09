import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatarDocumento, somenteDigitos } from "@/lib/clients/documento";

type SearchParams = Promise<{ q?: string }>;

export default function BuscaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Buscando…</p>}>
      <Resultados searchParams={searchParams} />
    </Suspense>
  );
}

async function Resultados({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { q = "" } = await searchParams;
  await requireUser();

  const termo = q.trim().replace(/[%_,()*\\]/g, "");
  const digitos = somenteDigitos(q);

  let clientes: { id: string; nome: string; cpf_cnpj: string }[] = [];
  let processos: {
    id: string;
    numero_cnj: string | null;
    assunto: string | null;
    situacao: string;
  }[] = [];

  if (termo) {
    const supabase = await createClient();

    const baseClientes = supabase.from("clients").select("id, nome, cpf_cnpj");
    const filtroClientes = digitos
      ? baseClientes.or(`nome.ilike.%${termo}%,cpf_cnpj.ilike.%${digitos}%`)
      : baseClientes.ilike("nome", `%${termo}%`);
    const { data: dadosClientes } = await filtroClientes.order("nome").limit(50);
    clientes = dadosClientes ?? [];

    const { data: dadosProcessos } = await supabase
      .from("processes")
      .select("id, numero_cnj, assunto, situacao")
      .or(
        `numero_cnj.ilike.%${termo}%,assunto.ilike.%${termo}%,parte_autora.ilike.%${termo}%,parte_re.ilike.%${termo}%`,
      )
      .order("updated_at", { ascending: false })
      .limit(50);
    processos = dadosProcessos ?? [];
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold text-slate-900">Busca</h1>
      <p className="mt-1 text-sm text-slate-500">Pesquise clientes e processos em um só lugar.</p>

      <form className="mt-6">
        <label htmlFor="q" className="sr-only">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Nome, CPF/CNPJ, número CNJ, assunto ou parte"
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </form>

      {termo && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Clientes ({clientes.length})</h2>
            {clientes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nenhum cliente encontrado.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
                {clientes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>
                      <span className="font-medium text-slate-900">{c.nome}</span>{" "}
                      <span className="text-slate-500">{formatarDocumento(c.cpf_cnpj)}</span>
                    </span>
                    <Link href={`/clientes/${c.id}`} className="text-slate-700 underline">
                      Abrir
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Processos ({processos.length})</h2>
            {processos.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nenhum processo encontrado.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
                {processos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>
                      <span className="font-medium text-slate-900">{p.numero_cnj ?? "Sem número CNJ"}</span>{" "}
                      <span className="text-slate-500">{p.assunto ?? ""}</span>
                    </span>
                    <Link href={`/processos/${p.id}`} className="text-slate-700 underline">
                      Abrir
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
