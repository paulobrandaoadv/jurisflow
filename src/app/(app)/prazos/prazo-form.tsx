"use client";

import Link from "next/link";
import { useActionState } from "react";
import { salvarPrazo } from "@/app/(app)/prazos/actions";
import { ROTULOS_CONTAGEM, TIPOS_CONTAGEM } from "@/lib/prazos/calculo";
import type { PrazoValues } from "@/lib/prazos/validation";

type Opcao = { id: string; rotulo: string };

type PrazoFormProps = {
  initial: PrazoValues;
  clientes: Opcao[];
  processos: Opcao[];
  equipe: Opcao[];
};

const CAMPO = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function PrazoForm({ initial, clientes, processos, equipe }: PrazoFormProps) {
  const [state, formAction, pending] = useActionState(salvarPrazo, undefined);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="mt-6 max-w-3xl space-y-6 rounded-xl bg-white p-6 shadow-sm">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="descricao" className={ROTULO}>
            Descrição do prazo
          </label>
          <input id="descricao" name="descricao" defaultValue={values.descricao} className={CAMPO} />
          {errors.descricao && <p className="mt-1 text-xs text-red-600">{errors.descricao}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="providencia" className={ROTULO}>
            Providência a cumprir
          </label>
          <input id="providencia" name="providencia" defaultValue={values.providencia} className={CAMPO} />
        </div>

        <div>
          <label htmlFor="processoId" className={ROTULO}>
            Processo
          </label>
          <select id="processoId" name="processoId" defaultValue={values.processoId} className={CAMPO}>
            <option value="">Sem processo vinculado</option>
            {processos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="clienteId" className={ROTULO}>
            Cliente
          </label>
          <select id="clienteId" name="clienteId" defaultValue={values.clienteId} className={CAMPO}>
            <option value="">Sem cliente vinculado</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="responsavelId" className={ROTULO}>
            Responsável
          </label>
          <select id="responsavelId" name="responsavelId" defaultValue={values.responsavelId} className={CAMPO}>
            <option value="">Não definido</option>
            {equipe.map((m) => (
              <option key={m.id} value={m.id}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fonte" className={ROTULO}>
            Fonte (ex.: DJe, intimação, sistema do tribunal)
          </label>
          <input id="fonte" name="fonte" defaultValue={values.fonte} className={CAMPO} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Datas de origem</h2>
        <p className="mt-1 text-xs text-slate-500">Informe as datas que existirem. O marco inicial usado no cálculo fica na seção abaixo.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["dataIdentificacao", "Data de identificação"],
              ["disponibilizacao", "Data de disponibilização"],
              ["publicacao", "Data de publicação"],
              ["ciencia", "Data da ciência"],
            ] as const
          ).map(([campo, rotulo]) => (
            <div key={campo}>
              <label htmlFor={campo} className={ROTULO}>
                {rotulo}
              </label>
              <input id={campo} name={campo} type="date" defaultValue={values[campo]} className={CAMPO} />
              {errors[campo] && <p className="mt-1 text-xs text-red-600">{errors[campo]}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Cálculo do vencimento</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="tipoContagem" className={ROTULO}>
              Tipo de contagem
            </label>
            <select id="tipoContagem" name="tipoContagem" defaultValue={values.tipoContagem} className={CAMPO}>
              {TIPOS_CONTAGEM.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ROTULOS_CONTAGEM[tipo]}
                </option>
              ))}
            </select>
            {errors.tipoContagem && <p className="mt-1 text-xs text-red-600">{errors.tipoContagem}</p>}
          </div>

          <div>
            <label htmlFor="marcoInicial" className={ROTULO}>
              Marco inicial (dias úteis ou corridos)
            </label>
            <input id="marcoInicial" name="marcoInicial" type="date" defaultValue={values.marcoInicial} className={CAMPO} />
            {errors.marcoInicial && <p className="mt-1 text-xs text-red-600">{errors.marcoInicial}</p>}
          </div>

          <div>
            <label htmlFor="dias" className={ROTULO}>
              Quantidade de dias
            </label>
            <input id="dias" name="dias" inputMode="numeric" defaultValue={values.dias} className={CAMPO} />
            {errors.dias && <p className="mt-1 text-xs text-red-600">{errors.dias}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="vencimentoManual" className={ROTULO}>
              Data-limite (somente para &quot;Data informada manualmente&quot;)
            </label>
            <input
              id="vencimentoManual"
              name="vencimentoManual"
              type="date"
              defaultValue={values.vencimentoManual}
              className={CAMPO}
            />
            {errors.vencimentoManual && <p className="mt-1 text-xs text-red-600">{errors.vencimentoManual}</p>}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          O cálculo considera apenas feriados nacionais e o recesso forense. Feriados estaduais, municipais e o calendário do tribunal devem ser conferidos pelo advogado na confirmação.
        </p>
      </section>

      <div>
        <label htmlFor="observacoes" className={ROTULO}>
          Observações
        </label>
        <textarea id="observacoes" name="observacoes" rows={3} defaultValue={values.observacoes} className={CAMPO} />
      </div>

      {errors.geral && <p className="text-sm text-red-600">{errors.geral}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar prazo"}
        </button>
        <Link href="/prazos" className="text-sm text-slate-600 hover:text-slate-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
