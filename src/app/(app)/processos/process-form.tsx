"use client";

import Link from "next/link";
import { useActionState } from "react";
import { salvarProcesso } from "@/app/(app)/processos/actions";
import {
  FASES,
  GRAUS,
  ROTULOS_FASE,
  ROTULOS_GRAU,
  ROTULOS_SITUACAO,
  SITUACOES,
  type ProcessoValues,
} from "@/lib/processos/validation";

type ProcessoFormProps = {
  id?: string;
  initial: ProcessoValues;
  readOnly: boolean;
};

const CAMPO = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function ProcessoForm({ id, initial, readOnly }: ProcessoFormProps) {
  const [state, formAction, pending] = useActionState(salvarProcesso, undefined);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="mt-6 max-w-3xl rounded-xl bg-white p-6 shadow-sm">
      {id && <input type="hidden" name="id" value={id} />}

      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="numeroCnj" className={ROTULO}>
            Número CNJ
          </label>
          <input
            id="numeroCnj"
            name="numeroCnj"
            defaultValue={values.numeroCnj}
            placeholder="0000000-00.0000.0.00.0000"
            className={CAMPO}
          />
          {errors.numeroCnj && <p className="mt-1 text-xs text-red-600">{errors.numeroCnj}</p>}
        </div>

        <div>
          <label htmlFor="tribunal" className={ROTULO}>
            Tribunal
          </label>
          <input id="tribunal" name="tribunal" defaultValue={values.tribunal} className={CAMPO} />
          {errors.tribunal && <p className="mt-1 text-xs text-red-600">{errors.tribunal}</p>}
        </div>

        <div>
          <label htmlFor="sistemaProcessual" className={ROTULO}>
            Sistema processual
          </label>
          <input
            id="sistemaProcessual"
            name="sistemaProcessual"
            defaultValue={values.sistemaProcessual}
            className={CAMPO}
          />
        </div>

        <div>
          <label htmlFor="grau" className={ROTULO}>
            Grau de jurisdição
          </label>
          <select id="grau" name="grau" defaultValue={values.grau} className={CAMPO}>
            <option value="">Não informado</option>
            {GRAUS.map((grau) => (
              <option key={grau} value={grau}>
                {ROTULOS_GRAU[grau]}
              </option>
            ))}
          </select>
          {errors.grau && <p className="mt-1 text-xs text-red-600">{errors.grau}</p>}
        </div>

        <div>
          <label htmlFor="comarca" className={ROTULO}>
            Comarca
          </label>
          <input id="comarca" name="comarca" defaultValue={values.comarca} className={CAMPO} />
        </div>

        <div>
          <label htmlFor="vara" className={ROTULO}>
            Vara
          </label>
          <input id="vara" name="vara" defaultValue={values.vara} className={CAMPO} />
        </div>

        <div>
          <label htmlFor="classe" className={ROTULO}>
            Classe
          </label>
          <input id="classe" name="classe" defaultValue={values.classe} className={CAMPO} />
        </div>

        <div>
          <label htmlFor="assunto" className={ROTULO}>
            Assunto
          </label>
          <input id="assunto" name="assunto" defaultValue={values.assunto} className={CAMPO} />
          {errors.assunto && <p className="mt-1 text-xs text-red-600">{errors.assunto}</p>}
        </div>

        <div>
          <label htmlFor="areaJuridica" className={ROTULO}>
            Área jurídica
          </label>
          <input
            id="areaJuridica"
            name="areaJuridica"
            defaultValue={values.areaJuridica}
            className={CAMPO}
          />
        </div>

        <div>
          <label htmlFor="parteAutora" className={ROTULO}>
            Parte autora
          </label>
          <input
            id="parteAutora"
            name="parteAutora"
            defaultValue={values.parteAutora}
            className={CAMPO}
          />
          {errors.parteAutora && (
            <p className="mt-1 text-xs text-red-600">{errors.parteAutora}</p>
          )}
        </div>

        <div>
          <label htmlFor="parteRe" className={ROTULO}>
            Parte ré
          </label>
          <input id="parteRe" name="parteRe" defaultValue={values.parteRe} className={CAMPO} />
          {errors.parteRe && <p className="mt-1 text-xs text-red-600">{errors.parteRe}</p>}
        </div>

        <div>
          <label htmlFor="dataDistribuicao" className={ROTULO}>
            Data de distribuição
          </label>
          <input
            id="dataDistribuicao"
            name="dataDistribuicao"
            type="date"
            defaultValue={values.dataDistribuicao}
            className={CAMPO}
          />
          {errors.dataDistribuicao && (
            <p className="mt-1 text-xs text-red-600">{errors.dataDistribuicao}</p>
          )}
        </div>

        <div>
          <label htmlFor="valorCausa" className={ROTULO}>
            Valor da causa (R$)
          </label>
          <input
            id="valorCausa"
            name="valorCausa"
            defaultValue={values.valorCausa}
            inputMode="decimal"
            placeholder="1.500,00"
            className={CAMPO}
          />
          {errors.valorCausa && <p className="mt-1 text-xs text-red-600">{errors.valorCausa}</p>}
        </div>

        <div>
          <label htmlFor="situacao" className={ROTULO}>
            Situação
          </label>
          <select id="situacao" name="situacao" defaultValue={values.situacao} className={CAMPO}>
            {SITUACOES.map((situacao) => (
              <option key={situacao} value={situacao}>
                {ROTULOS_SITUACAO[situacao]}
              </option>
            ))}
          </select>
          {errors.situacao && <p className="mt-1 text-xs text-red-600">{errors.situacao}</p>}
        </div>

        <div>
          <label htmlFor="fase" className={ROTULO}>
            Fase
          </label>
          <select id="fase" name="fase" defaultValue={values.fase} className={CAMPO}>
            <option value="">Não informada</option>
            {FASES.map((fase) => (
              <option key={fase} value={fase}>
                {ROTULOS_FASE[fase]}
              </option>
            ))}
          </select>
          {errors.fase && <p className="mt-1 text-xs text-red-600">{errors.fase}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="observacoes" className={ROTULO}>
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={4}
            defaultValue={values.observacoes}
            className={CAMPO}
          />
        </div>
      </fieldset>

      {errors.geral && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {errors.geral}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        {!readOnly && (
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
        )}
        <Link href="/processos" className="text-sm text-slate-600 underline hover:text-slate-900">
          Voltar à lista
        </Link>
      </div>
    </form>
  );
}
