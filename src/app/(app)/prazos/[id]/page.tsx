import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { calcularPrazo, ROTULOS_CONTAGEM, type TipoContagem } from "@/lib/prazos/calculo";
import {
  diasAte,
  formatarData,
  hojeSaoPaulo,
  ROTULOS_SITUACAO_PRAZO,
  UUID,
  vencimentoEfetivo,
  type SituacaoPrazo,
} from "@/lib/prazos/validation";
import {
  cancelarPrazo,
  confirmarPrazo,
  corrigirPrazo,
  marcarCumprido,
} from "@/app/(app)/prazos/actions";

type SearchParams = Promise<{ salvo?: string; erro?: string }>;

const MENSAGENS_SALVO: Record<string, string> = {
  "1": "Prazo cadastrado. Confira o cálculo abaixo e confirme.",
  confirmado: "Prazo confirmado.",
  corrigido: "Vencimento corrigido e confirmado.",
  cumprido: "Prazo marcado como cumprido.",
  cancelado: "Prazo cancelado.",
};

const MENSAGENS_ERRO: Record<string, string> = {
  situacao: "Esta ação não é possível na situação atual do prazo.",
  "correcao-invalida": "Informe a nova data e a justificativa da correção.",
  falha: "Não foi possível concluir a ação. Tente novamente.",
};

export default async function PrazoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { salvo, erro } = await searchParams;
  const user = await requireUser();
  const podeEscrever = can(user.role, "prazos:escrever");

  const supabase = await createClient();
  const { data: prazo } = await supabase
    .from("deadlines")
    .select(
      "*, processes(id, numero_cnj, assunto), clients(id, nome), responsavel:profiles!deadlines_responsavel_id_fkey(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!prazo) notFound();

  const hoje = hojeSaoPaulo();
  const efetivo = vencimentoEfetivo(prazo);
  const dias = diasAte(efetivo, hoje);
  const situacao = prazo.situacao as SituacaoPrazo;
  const tipo = prazo.tipo_contagem as TipoContagem;

  const calculo =
    (tipo === "uteis" || tipo === "corridos") && prazo.marco_inicial && prazo.dias
      ? calcularPrazo(prazo.marco_inicial, prazo.dias, tipo)
      : null;

  const mensagem = salvo ? MENSAGENS_SALVO[salvo] : erro ? MENSAGENS_ERRO[erro] ?? MENSAGENS_ERRO.falha : null;
  const emAberto = situacao === "pendente" || situacao === "confirmado";

  return (
    <main>
      <Link href="/prazos" className="text-sm text-slate-500 hover:text-slate-900">
        ← Voltar para prazos
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{prazo.descricao}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ROTULOS_SITUACAO_PRAZO[situacao]} · {prazo.processes?.numero_cnj ?? "Sem processo"}
            {prazo.clients?.nome ? ` · ${prazo.clients.nome}` : ""}
          </p>
        </div>
      </div>

      {mensagem && (
        <p className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">{mensagem}</p>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Validação do vencimento</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Linha titulo="Tipo de contagem" valor={ROTULOS_CONTAGEM[tipo]} />
            <Linha titulo="Marco inicial" valor={formatarData(prazo.marco_inicial)} />
            <Linha titulo="Dias" valor={prazo.dias ?? "—"} />
            {calculo && <Linha titulo="Início da contagem" valor={formatarData(calculo.dataInicial)} />}
            <Linha titulo="Vencimento calculado" valor={formatarData(prazo.vencimento_calculado)} />
            <Linha titulo="Vencimento confirmado" valor={formatarData(prazo.vencimento_confirmado)} />
            <Linha
              titulo="Situação do vencimento"
              valor={
                emAberto ? (
                  dias < 0 ? (
                    <span className="text-red-700">Vencido há {Math.abs(dias)} dia(s)</span>
                  ) : (
                    <span>{dias === 0 ? "Vence hoje" : `Vence em ${dias} dia(s)`}</span>
                  )
                ) : (
                  "—"
                )
              }
            />
          </dl>
          <p className="mt-4 text-xs text-slate-500">{prazo.regra_aplicada}</p>
          {calculo && (
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>
                <strong>Feriados nacionais no período:</strong>{" "}
                {calculo.feriados.length ? calculo.feriados.map(formatarData).join(", ") : "nenhum"}
              </p>
              <p>
                <strong>Dias de recesso forense no período:</strong> {calculo.suspensoes.length}
              </p>
            </div>
          )}
          <p className="mt-3 text-xs text-amber-700">
            Confira feriados estaduais, municipais e o calendário do tribunal antes de confirmar.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Origem e responsável</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Linha titulo="Identificação" valor={formatarData(prazo.data_identificacao)} />
            <Linha titulo="Disponibilização" valor={formatarData(prazo.disponibilizacao)} />
            <Linha titulo="Publicação" valor={formatarData(prazo.publicacao)} />
            <Linha titulo="Ciência" valor={formatarData(prazo.ciencia)} />
            <Linha titulo="Fonte" valor={prazo.fonte ?? "—"} />
            <Linha titulo="Providência" valor={prazo.providencia ?? "—"} />
            <Linha titulo="Responsável" valor={prazo.responsavel?.name ?? "Não definido"} />
            <Linha titulo="Confirmado em" valor={prazo.confirmado_em ? formatarData(prazo.confirmado_em.slice(0, 10)) : "—"} />
          </dl>
          {prazo.justificativa_correcao && (
            <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              Correção manual: {prazo.justificativa_correcao}
            </p>
          )}
          {prazo.observacoes && <p className="mt-4 text-sm text-slate-600">{prazo.observacoes}</p>}
        </div>
      </section>

      {podeEscrever && emAberto && (
        <section className="mt-6 space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Ações</h2>
          <div className="flex flex-wrap gap-3">
            {situacao === "pendente" && (
              <form action={confirmarPrazo}>
                <input type="hidden" name="id" value={id} />
                <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                  Confirmar vencimento calculado
                </button>
              </form>
            )}
            {situacao === "confirmado" && (
              <form action={marcarCumprido}>
                <input type="hidden" name="id" value={id} />
                <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                  Marcar como cumprido
                </button>
              </form>
            )}
            <form action={cancelarPrazo}>
              <input type="hidden" name="id" value={id} />
              <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                Cancelar prazo
              </button>
            </form>
          </div>

          <form action={corrigirPrazo} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
            <input type="hidden" name="id" value={id} />
            <div>
              <label htmlFor="vencimentoCorrigido" className="block text-sm font-medium text-slate-700">
                Nova data-limite
              </label>
              <input
                id="vencimentoCorrigido"
                name="vencimentoCorrigido"
                type="date"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="justificativa" className="block text-sm font-medium text-slate-700">
                Justificativa da correção
              </label>
              <input
                id="justificativa"
                name="justificativa"
                required
                maxLength={500}
                placeholder="Ex.: feriado municipal não considerado no cálculo"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Corrigir e confirmar
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function Linha({ titulo, valor }: { titulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{titulo}</dt>
      <dd className="text-right font-medium text-slate-900">{valor}</dd>
    </div>
  );
}
