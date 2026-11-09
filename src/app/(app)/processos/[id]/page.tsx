import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ProcessoForm } from "@/app/(app)/processos/process-form";
import {
  adicionarMovimentacao,
  desvincularAdvogado,
  desvincularCliente,
  vincularAdvogado,
  vincularCliente,
} from "@/app/(app)/processos/actions";
import { ConfirmSubmit } from "@/app/(app)/processos/[id]/confirm-submit";
import { POLOS, ROTULOS_POLO, type ProcessoValues } from "@/lib/processos/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ salvo?: string; erro?: string }>;

const MENSAGENS_ERRO: Record<string, string> = {
  "cliente-ja-vinculado": "Este cliente já está vinculado ao processo.",
  "advogado-ja-vinculado": "Este advogado já faz parte da equipe do processo.",
  "falha-vinculo": "Não foi possível atualizar os vínculos. Tente novamente.",
  "movimentacao-invalida": "Informe data e título da movimentação.",
  "falha-movimentacao": "Não foi possível registrar a movimentação.",
};

export default function ProcessoPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <DetalheProcesso params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DetalheProcesso({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  await connection();
  const { id } = await params;
  const { salvo, erro } = await searchParams;
  if (!UUID.test(id)) notFound();

  const user = await requirePermission("processos:ler");
  const podeEscrever = can(user.role, "processos:escrever");

  const supabase = await createClient();
  const { data: processo, error } = await supabase
    .from("processes")
    .select(
      "id, numero_cnj, tribunal, sistema_processual, grau, comarca, vara, classe, assunto, area_juridica, parte_autora, parte_re, data_distribuicao, valor_causa, situacao, fase, observacoes",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <p className="text-sm text-red-600">Não foi possível carregar o processo.</p>;
  }
  if (!processo) notFound();

  const [{ data: vinculos }, { data: membros }, { data: movimentos }, { data: equipe }] =
    await Promise.all([
      supabase
        .from("process_clients")
        .select("client_id, polo, clients(nome)")
        .eq("process_id", id),
      supabase.from("process_members").select("profile_id").eq("process_id", id),
      supabase
        .from("process_movements")
        .select("id, data, titulo, descricao, origem, responsavel_id")
        .eq("process_id", id)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.rpc("equipe_ativa"),
    ]);

  const { data: clientesDisponiveis } = podeEscrever
    ? await supabase.from("clients").select("id, nome").order("nome").limit(500)
    : { data: null };

  const nomesEquipe = new Map<string, string>(
    ((equipe ?? []) as { id: string; name: string }[]).map((m) => [m.id, m.name]),
  );
  const idsVinculados = new Set((vinculos ?? []).map((v) => v.client_id));
  const clientesParaVincular = (clientesDisponiveis ?? []).filter((c) => !idsVinculados.has(c.id));
  const idsMembros = new Set((membros ?? []).map((m) => m.profile_id));
  const membrosParaVincular = (equipe ?? []).filter(
    (m: { id: string }) => !idsMembros.has(m.id),
  ) as { id: string; name: string }[];

  const valores: ProcessoValues = {
    numeroCnj: processo.numero_cnj ?? "",
    tribunal: processo.tribunal ?? "",
    sistemaProcessual: processo.sistema_processual ?? "",
    grau: processo.grau ?? "",
    comarca: processo.comarca ?? "",
    vara: processo.vara ?? "",
    classe: processo.classe ?? "",
    assunto: processo.assunto ?? "",
    areaJuridica: processo.area_juridica ?? "",
    parteAutora: processo.parte_autora ?? "",
    parteRe: processo.parte_re ?? "",
    dataDistribuicao: processo.data_distribuicao ?? "",
    valorCausa: processo.valor_causa
      ? Number(processo.valor_causa).toFixed(2).replace(".", ",")
      : "",
    situacao: processo.situacao,
    fase: processo.fase ?? "",
    observacoes: processo.observacoes ?? "",
  };

  return (
    <main>
      <Link href="/processos" className="text-sm text-slate-600 underline hover:text-slate-900">
        Voltar à lista de processos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {processo.numero_cnj ?? "Processo administrativo"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {podeEscrever ? "Edite os dados do processo." : "Somente leitura para o seu perfil."}
      </p>

      {salvo === "1" && (
        <p role="status" className="mt-4 text-sm text-green-700">
          Processo salvo com sucesso.
        </p>
      )}
      {erro && MENSAGENS_ERRO[erro] && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {MENSAGENS_ERRO[erro]}
        </p>
      )}

      <ProcessoForm id={processo.id} initial={valores} readOnly={!podeEscrever} />

      <section className="mt-10 max-w-3xl rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Clientes vinculados</h2>
        {!vinculos || vinculos.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum cliente vinculado.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {vinculos.map((v) => {
              const cliente = v.clients as unknown as { nome: string } | null;
              return (
                <li key={v.client_id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <Link href={`/clientes/${v.client_id}`} className="font-medium text-slate-900 underline">
                      {cliente?.nome ?? "Cliente"}
                    </Link>{" "}
                    <span className="text-slate-500">({ROTULOS_POLO[v.polo as keyof typeof ROTULOS_POLO]})</span>
                  </span>
                  {podeEscrever && (
                    <form action={desvincularCliente}>
                      <input type="hidden" name="processoId" value={id} />
                      <input type="hidden" name="clienteId" value={v.client_id} />
                      <ConfirmSubmit mensagem="Remover este cliente do processo?">Remover</ConfirmSubmit>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {podeEscrever && clientesParaVincular.length > 0 && (
          <form action={vincularCliente} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <input type="hidden" name="processoId" value={id} />
            <div>
              <label htmlFor="clienteId" className="block text-sm font-medium text-slate-700">
                Cliente
              </label>
              <select id="clienteId" name="clienteId" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm">
                {clientesParaVincular.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="polo" className="block text-sm font-medium text-slate-700">
                Polo
              </label>
              <select id="polo" name="polo" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm">
                {POLOS.map((p) => (
                  <option key={p} value={p}>
                    {ROTULOS_POLO[p]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Vincular cliente
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 max-w-3xl rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Equipe responsável</h2>
        {!membros || membros.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum integrante vinculado.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {membros.map((m) => (
              <li key={m.profile_id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-900">{nomesEquipe.get(m.profile_id) ?? "Usuário inativo"}</span>
                {podeEscrever && (
                  <form action={desvincularAdvogado}>
                    <input type="hidden" name="processoId" value={id} />
                    <input type="hidden" name="profileId" value={m.profile_id} />
                    <ConfirmSubmit mensagem="Remover este integrante da equipe?">Remover</ConfirmSubmit>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {podeEscrever && membrosParaVincular.length > 0 && (
          <form action={vincularAdvogado} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <input type="hidden" name="processoId" value={id} />
            <div>
              <label htmlFor="profileId" className="block text-sm font-medium text-slate-700">
                Integrante
              </label>
              <select id="profileId" name="profileId" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm">
                {membrosParaVincular.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Adicionar à equipe
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 max-w-3xl rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Movimentações</h2>
        <p className="mt-1 text-sm text-slate-500">
          Registro cronológico. Movimentações não podem ser editadas nem apagadas.
        </p>

        {podeEscrever && (
          <form action={adicionarMovimentacao} className="mt-4 grid gap-3 border-b border-slate-100 pb-4 sm:grid-cols-2">
            <input type="hidden" name="processoId" value={id} />
            <div>
              <label htmlFor="data" className="block text-sm font-medium text-slate-700">
                Data
              </label>
              <input id="data" name="data" type="date" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-slate-700">
                Título
              </label>
              <input id="titulo" name="titulo" required maxLength={200} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">
                Descrição
              </label>
              <textarea id="descricao" name="descricao" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Registrar movimentação
              </button>
            </div>
          </form>
        )}

        {!movimentos || movimentos.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nenhuma movimentação registrada.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {movimentos.map((mov) => (
              <li key={mov.id} className="border-l-2 border-slate-200 pl-4">
                <p className="text-xs text-slate-500">
                  {new Date(`${mov.data}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                  {mov.origem === "manual" ? "Manual" : "Integração"} ·{" "}
                  {nomesEquipe.get(mov.responsavel_id ?? "") ?? "Responsável não identificado"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">{mov.titulo}</p>
                {mov.descricao && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{mov.descricao}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
