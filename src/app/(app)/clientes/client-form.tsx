"use client";

import Link from "next/link";
import { useActionState } from "react";
import { salvarCliente } from "@/app/(app)/clientes/actions";
import type { ClienteValues } from "@/lib/clients/validation";

type ClienteFormProps = {
  id?: string;
  initial: ClienteValues;
  readOnly: boolean;
};

export function ClienteForm({ id, initial, readOnly }: ClienteFormProps) {
  const [state, formAction, pending] = useActionState(salvarCliente, undefined);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="mt-6 max-w-2xl rounded-xl bg-white p-6 shadow-sm">
      {id && <input type="hidden" name="id" value={id} />}

      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tipo" className="block text-sm font-medium text-slate-700">
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={values.tipo}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="pf">Pessoa física</option>
            <option value="pj">Pessoa jurídica</option>
          </select>
          {errors.tipo && <p className="mt-1 text-xs text-red-600">{errors.tipo}</p>}
        </div>

        <div>
          <label htmlFor="cpfCnpj" className="block text-sm font-medium text-slate-700">
            CPF / CNPJ
          </label>
          <input
            id="cpfCnpj"
            name="cpfCnpj"
            defaultValue={values.cpfCnpj}
            inputMode="numeric"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.cpfCnpj && <p className="mt-1 text-xs text-red-600">{errors.cpfCnpj}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="nome" className="block text-sm font-medium text-slate-700">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            defaultValue={values.nome}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="telefone" className="block text-sm font-medium text-slate-700">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            defaultValue={values.telefone}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="observacoes" className="block text-sm font-medium text-slate-700">
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={4}
            defaultValue={values.observacoes}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
        <Link href="/clientes" className="text-sm text-slate-600 underline hover:text-slate-900">
          Voltar à lista
        </Link>
      </div>
    </form>
  );
}
