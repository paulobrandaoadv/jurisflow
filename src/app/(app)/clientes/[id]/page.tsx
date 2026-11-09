import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "@/app/(app)/clientes/client-form";
import { formatarDocumento } from "@/lib/clients/documento";
import { ROTULOS_GRAU, ROTULOS_POLO, ROTULOS_SITUACAO } from "@/lib/processos/validation";
import { ROTULOS_CATEGORIA, type Categoria } from "@/lib/documentos/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ABAS = [
  { id: "dados", label: "Dados" },
  { id: "processos", label: "Processos" },
  { id: "documentos", label: "Documentos" },
  { id: "procuracoes", label: "Procurações", etapa: "Etapa 3" },
  { id: "contratos", label: "Contratos", etapa: "Etapa 5" },
  { id: "declaracoes", label: "Declarações", etapa: "Etapa 3" },
  { id: "atendimentos", label: "Atendimentos", etapa: "Etapa 5" },
  { id: "prazos", label: "Prazos", etapa: "Etapa 4" },
  { id: "agenda", label: "Agenda", etapa: "Etapa 4" },
  { id: "financeiro", label: "Financeiro", etapa: "Etapa 5" },
  { id: "historico", label: "Histórico" },
] as const;

type Aba = (typeof ABAS)[number]["id"];

type Processo = {
  id: string;
  numero_cnj: string | null;
  assunto: string | null;
  situacao: keyof typeof ROTULOS_SITUACAO;
  grau: keyof typeof ROTULOS_GRAU | null;
};

export default function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <EditarCliente params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditarCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  await connection();
  const { id } = await params;
  const { aba: abaSolicitada } = await searchParams;
  const aba: Aba = ABAS.some((a) => a.id === abaSolicitada)
    ? (abaSolicitada as Aba)
    : "dados";
  if (!UUID.test(id)) notFound();

  const user = await requirePermission("clientes:ler");
  const podeEscrever = can(user.role, "clientes:escrever");

  const supabase = await createClient();
  const { data: cliente, error } = await supabase
    .from("clients")
    .select("id, tipo, nome, cpf_cnpj, email, telefone, observacoes")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <p className="text-sm text-red-600">Não foi possível carregar o cliente.</p>;
  }
  if (!cliente) notFound();

  const { data: vinculos } = await supabase
    .from("process_clients")
    .select("polo, processes(id, numero_cnj, assunto, situacao, grau)")
    .eq("client_id", id);

  const processos = (vinculos ?? [])
    .map((v) => ({ polo: v.polo, processo: v.processes as unknown as Processo | null }))
    .filter((v): v is { polo: string; processo: Processo } => v.processo !== null);

  const idsProcessos = processos.map((p) => p.processo.id);
  const { data: movimentos } =
    aba === "historico" && idsProcessos.length > 0
      ? await supabase
          .from("process_movements")
          .select("id, process_id, data, titulo, descricao")
          .in("process_id", idsProcessos)
          .order("data", { ascending: false })
          .limit(200)
      : { data: [] };

  const processoPorId = new Map(processos.map((p) => [p.processo.id, p.processo]));

  const { data: documentosCliente } =
    aba === "documentos"
      ? await supabase
          .from("documents")
          .select("id, nome, categoria, data_documento, created_at")
          .eq("client_id", id)
          .order("created_at", { ascending: false })
          .limit(200)
      : { data: [] };

  return (
    <main>
      <h1 className="text-2xl font-semibold text-slate-900">{cliente.nome}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {podeEscrever ? "Dossiê do cliente." : "Somente leitura para o seu perfil."}
      </p>

      <nav aria-label="Abas do dossiê" className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {ABAS.map((item) =>
          "etapa" in item ? (
            <span
              key={item.id}
              title={`Disponível na ${item.etapa}`}
              className="cursor-not-allowed px-3 py-2 text-sm text-slate-400"
            >
              {item.label}
            </span>
          ) : (
            <Link
              key={item.id}
              href={`/clientes/${cliente.id}?aba=${item.id}`}
              aria-current={aba === item.id ? "page" : undefined}
              className={`px-3 py-2 text-sm ${
                aba === item.id
                  ? "border-b-2 border-slate-900 font-medium text-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>

      {aba === "dados" && (
        <ClienteForm
          id={cliente.id}
          readOnly={!podeEscrever}
          initial={{
            tipo: cliente.tipo,
            nome: cliente.nome,
            cpfCnpj: formatarDocumento(cliente.cpf_cnpj),
            email: cliente.email ?? "",
            telefone: cliente.telefone ?? "",
            observacoes: cliente.observacoes ?? "",
          }}
        />
      )}

      {aba === "processos" && (
        <section className="mt-6 max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Processos do cliente</h2>
            <Link href="/processos" className="text-sm text-slate-700 underline">
              Gerenciar processos
            </Link>
          </div>
          {processos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum processo vinculado a este cliente.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {processos.map((p) => (
                <li key={p.processo.id} className="flex items-center justify-between py-3 text-sm">
                  <span>
                    <span className="font-medium text-slate-900">
                      {p.processo.numero_cnj ?? "Sem número CNJ"}
                    </span>{" "}
                    <span className="text-slate-500">
                      {p.processo.assunto ?? ""} · {ROTULOS_POLO[p.polo as keyof typeof ROTULOS_POLO] ?? p.polo} ·{" "}
                      {ROTULOS_SITUACAO[p.processo.situacao]}
                    </span>
                  </span>
                  <Link href={`/processos/${p.processo.id}`} className="text-slate-700 underline">
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {aba === "documentos" && (
        <section className="mt-6 max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Documentos do cliente</h2>
            <Link href="/documentos/novo" className="text-sm text-slate-700 underline">
              Enviar documento
            </Link>
          </div>
          {!documentosCliente || documentosCliente.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum documento vinculado a este cliente.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {documentosCliente.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3 text-sm">
                  <span>
                    <span className="font-medium text-slate-900">{doc.nome}</span>{" "}
                    <span className="text-slate-500">
                      · {ROTULOS_CATEGORIA[doc.categoria as Categoria] ?? doc.categoria}
                      {doc.data_documento &&
                        ` · ${new Date(`${doc.data_documento}T00:00:00`).toLocaleDateString("pt-BR")}`}
                    </span>
                  </span>
                  <Link href={`/documentos/${doc.id}`} className="text-slate-700 underline">
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {aba === "historico" && (
        <section className="mt-6 max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Movimentações dos processos</h2>
          {!movimentos || movimentos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhuma movimentação registrada para os processos deste cliente.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {movimentos.map((mov) => (
                <li key={mov.id} className="border-l-2 border-slate-200 pl-4">
                  <p className="text-xs text-slate-500">
                    {new Date(`${mov.data}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                    {processoPorId.get(mov.process_id)?.numero_cnj ?? "Sem número CNJ"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{mov.titulo}</p>
                  {mov.descricao && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{mov.descricao}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {(() => {
        const abaAtual = ABAS.find((a) => a.id === aba);
        return abaAtual && "etapa" in abaAtual ? (
          <p className="mt-6 text-sm text-slate-500">Esta aba será implementada na {abaAtual.etapa}.</p>
        ) : null;
      })()}

      <div className="mt-6">
        <Link href="/clientes" className="text-sm text-slate-600 underline hover:text-slate-900">
          Voltar à lista de clientes
        </Link>
      </div>
    </main>
  );
}
