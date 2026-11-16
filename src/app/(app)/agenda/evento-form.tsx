"use client";

import Link from "next/link";
import { useActionState } from "react";
import { salvarEvento } from "@/app/(app)/agenda/actions";
import { ROTULOS_TIPO_EVENTO, TIPOS_EVENTO, type EventoValues } from "@/lib/agenda/validation";

type Opcao = { id: string; rotulo: string };

type EventoFormProps = {
  initial: EventoValues;
  clientes: Opcao[];
  processos: Opcao[];
  equipe: Opcao[];
};

const CAMPO = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function EventoForm({ initial, clientes, processos, equipe }: EventoFormProps) {
  const [state, formAction, pending] = useActionState(salvarEvento, undefined);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="mt-6 max-w-3xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="titulo" className={ROTULO}>
            Título
          </label>
          <input id="titulo" name="titulo" defaultValue={values.titulo} className={CAMPO} />
          {errors.titulo && <p className="mt-1 text-xs text-red-600">{errors.titulo}</p>}
        </div>

        <div>
          <label htmlFor="tipo" className={ROTULO}>
            Tipo
          </label>
          <select id="tipo" name="tipo" defaultValue={values.tipo} className={CAMPO}>
            {TIPOS_EVENTO.map((t) => (
              <option key={t} value={t}>
                {ROTULOS_TIPO_EVENTO[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="data" className={ROTULO}>
              Data
            </label>
            <input id="data" name="data" type="date" defaultValue={values.data} className={CAMPO} />
            {errors.data && <p className="mt-1 text-xs text-red-600">{errors.data}</p>}
          </div>
          <div>
            <label htmlFor="horario" className={ROTULO}>
              Horário
            </label>
            <input id="horario" name="horario" type="time" defaultValue={values.horario} className={CAMPO} />
            {errors.horario && <p className="mt-1 text-xs text-red-600">{errors.horario}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="local" className={ROTULO}>
            Local
          </label>
          <input id="local" name="local" defaultValue={values.local} className={CAMPO} />
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

        <div className="sm:col-span-2">
          <label htmlFor="descricao" className={ROTULO}>
            Descrição
          </label>
          <textarea id="descricao" name="descricao" rows={3} defaultValue={values.descricao} className={CAMPO} />
        </div>
      </div>

      {errors.geral && <p className="text-sm text-red-600">{errors.geral}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar compromisso"}
        </button>
        <Link href="/agenda" className="text-sm text-slate-600 hover:text-slate-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
