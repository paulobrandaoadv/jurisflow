import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { formatarData } from "@/lib/prazos/validation";
import { alterarStatusPublicacao } from "./actions";

type SearchParams = Promise<{ status?: string }>;

const FILTROS = [
  { valor: "nova", rotulo: "Novas" },
  { valor: "tratada", rotulo: "Tratadas" },
  { valor: "ignorada", rotulo: "Ignoradas" },
] as const;

type PublicacaoLinha = {
  id: string;
  numero_processo: string;
  sigla_tribunal: string | null;
  data_disponibilizacao: string;
  tipo_comunicacao: string | null;
  nome_orgao: string | null;
  texto: string | null;
  link: string | null;
  process_id: string | null;
  status: string;
};

export default function PublicacoesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando publicações…</p>}>
      <PublicacoesList searchParams={searchParams} />
    </Suspense>
  );
}

async function PublicacoesList({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { status } = await searchParams;
  const filtro = FILTROS.some((f) => f.valor === status) ? (status as string) : "nova";
  const user = await requireUser();
  const podeEscrever = can(user.role, "publicacoes:escrever");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("publicacoes")
    .select(
      "id, numero_processo, sigla_tribunal, data_disponibilizacao, tipo_comunicacao, nome_orgao, texto, link, process_id, status",
    )
    .eq("status", filtro)
    .order("data_disponibilizacao", { ascending: false })
    .limit(200);

  const publicacoes = (data ?? []) as PublicacaoLinha[];

  return (
    <main>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Publicações e Intimações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Publicações do DJEN dos últimos 7 dias para a OAB configurada. Confira o texto e marque como tratada ou
          ignorada.
        </p>
      </div>

      <nav className="mt-6 flex gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/publicacoes?status=${f.valor}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filtro === f.valor
                ? "bg-slate-900 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-6 text-sm text-red-600">Não foi possível carregar as publicações.</p>
      ) : publicacoes.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Nenhuma publicação nesta lista.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {publicacoes.map((p) => (
            <li key={p.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium text-slate-900">{formatarData(p.data_disponibilizacao)}</span>
                {p.sigla_tribunal && <span className="text-slate-600">{p.sigla_tribunal}</span>}
                {p.tipo_comunicacao && <span className="text-slate-600">{p.tipo_comunicacao}</span>}
                <span className="font-mono text-slate-500">{p.numero_processo}</span>
                {p.process_id && (
                  <Link href={`/processos/${p.process_id}`} className="text-slate-700 underline hover:text-slate-900">
                    Abrir processo
                  </Link>
                )}
              </div>
              {p.nome_orgao && <p className="mt-2 text-sm text-slate-500">{p.nome_orgao}</p>}
              {p.texto && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-slate-700">{textoSimples(p.texto)}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-slate-700 underline">
                    Inteiro teor
                  </a>
                )}
                {podeEscrever && (
                  <>
                    {filtro !== "tratada" && <AcaoStatus id={p.id} status="tratada" rotulo="Marcar como tratada" />}
                    {filtro !== "ignorada" && <AcaoStatus id={p.id} status="ignorada" rotulo="Ignorar" />}
                    {filtro !== "nova" && <AcaoStatus id={p.id} status="nova" rotulo="Voltar para novas" />}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function AcaoStatus({ id, status, rotulo }: { id: string; status: string; rotulo: string }) {
  return (
    <form action={alterarStatusPublicacao}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50">
        {rotulo}
      </button>
    </form>
  );
}

// O DJEN devolve o texto em HTML; mostramos só o conteúdo textual.
function textoSimples(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .trim();
}
