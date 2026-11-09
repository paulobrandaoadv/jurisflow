"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type DragEvent } from "react";
import { atualizarDocumento, enviarDocumentos, type DocumentoFormState } from "@/app/(app)/documentos/actions";
import {
  CATEGORIAS,
  ROTULOS_CATEGORIA,
  type ValoresDocumento,
} from "@/lib/documentos/validation";

type Opcao = { id: string; rotulo: string };

type DocumentoFormProps = {
  id?: string;
  modo: "novo" | "editar";
  initial: ValoresDocumento;
  readOnly: boolean;
  clientes: Opcao[];
  processos: Opcao[];
  equipe: Opcao[];
};

const CAMPO = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function DocumentoForm({
  id,
  modo,
  initial,
  readOnly,
  clientes,
  processos,
  equipe,
}: DocumentoFormProps) {
  const acao = modo === "novo" ? enviarDocumentos : atualizarDocumento;
  const [state, formAction, pending] = useActionState<DocumentoFormState, FormData>(acao, undefined);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};

  const inputArquivos = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [nomesArquivos, setNomesArquivos] = useState<string[]>([]);

  function atualizarNomes(lista: FileList | null) {
    setNomesArquivos(lista ? Array.from(lista).map((f) => f.name) : []);
  }

  function soltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastando(false);
    if (!inputArquivos.current || evento.dataTransfer.files.length === 0) return;
    inputArquivos.current.files = evento.dataTransfer.files;
    atualizarNomes(evento.dataTransfer.files);
  }

  const multiplos = modo === "novo";

  return (
    <form action={formAction} className="mt-6 max-w-3xl rounded-xl bg-white p-6 shadow-sm">
      {id && <input type="hidden" name="id" value={id} />}

      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
        {modo === "novo" && (
          <div className="sm:col-span-2">
            <span className={ROTULO}>Arquivos</span>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltar}
              className={`mt-1 rounded-md border-2 border-dashed p-6 text-center text-sm ${
                arrastando ? "border-slate-900 bg-slate-100" : "border-slate-300"
              }`}
            >
              <p className="text-slate-600">Arraste os arquivos para cá ou escolha abaixo.</p>
              <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG ou WEBP. Até 20 MB por arquivo e 50 MB no total.</p>
              <input
                ref={inputArquivos}
                id="arquivos"
                name="arquivos"
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => atualizarNomes(e.currentTarget.files)}
                className="mt-3 w-full text-sm"
              />
            </div>
            {nomesArquivos.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                {nomesArquivos.map((nome) => (
                  <li key={nome}>{nome}</li>
                ))}
              </ul>
            )}
            {errors.arquivos && <p className="mt-1 text-xs text-red-600">{errors.arquivos}</p>}
          </div>
        )}

        <div>
          <label htmlFor="nome" className={ROTULO}>
            Nome {multiplos && "(opcional com vários arquivos)"}
          </label>
          <input id="nome" name="nome" defaultValue={values.nome} maxLength={200} className={CAMPO} />
          {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome}</p>}
        </div>

        <div>
          <label htmlFor="categoria" className={ROTULO}>
            Categoria
          </label>
          <select id="categoria" name="categoria" defaultValue={values.categoria} className={CAMPO}>
            <option value="">Escolha…</option>
            {CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                {ROTULOS_CATEGORIA[categoria]}
              </option>
            ))}
          </select>
          {errors.categoria && <p className="mt-1 text-xs text-red-600">{errors.categoria}</p>}
        </div>

        <div>
          <label htmlFor="clienteId" className={ROTULO}>
            Cliente
          </label>
          <select id="clienteId" name="clienteId" defaultValue={values.clienteId} className={CAMPO}>
            <option value="">Nenhum</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
          {errors.clienteId && <p className="mt-1 text-xs text-red-600">{errors.clienteId}</p>}
        </div>

        <div>
          <label htmlFor="responsavelId" className={ROTULO}>
            Responsável
          </label>
          <select id="responsavelId" name="responsavelId" defaultValue={values.responsavelId} className={CAMPO}>
            <option value="">Não informado</option>
            {equipe.map((m) => (
              <option key={m.id} value={m.id}>
                {m.rotulo}
              </option>
            ))}
          </select>
          {errors.responsavelId && <p className="mt-1 text-xs text-red-600">{errors.responsavelId}</p>}
        </div>

        <div>
          <label htmlFor="dataDocumento" className={ROTULO}>
            Data do documento
          </label>
          <input
            id="dataDocumento"
            name="dataDocumento"
            type="date"
            defaultValue={values.dataDocumento}
            className={CAMPO}
          />
          {errors.dataDocumento && <p className="mt-1 text-xs text-red-600">{errors.dataDocumento}</p>}
        </div>

        <div>
          <label htmlFor="tags" className={ROTULO}>
            Tags (separadas por vírgula)
          </label>
          <input id="tags" name="tags" defaultValue={values.tags} placeholder="ex.: urgente, original" className={CAMPO} />
          {errors.tags && <p className="mt-1 text-xs text-red-600">{errors.tags}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="processoIds" className={ROTULO}>
            Processos vinculados (Ctrl/Cmd para escolher vários)
          </label>
          <select
            id="processoIds"
            name="processoIds"
            multiple
            size={Math.min(Math.max(processos.length, 3), 6)}
            defaultValue={values.processoIds}
            className={CAMPO}
          >
            {processos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </select>
          {errors.processoIds && <p className="mt-1 text-xs text-red-600">{errors.processoIds}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="descricao" className={ROTULO}>
            Descrição
          </label>
          <textarea id="descricao" name="descricao" rows={3} defaultValue={values.descricao} className={CAMPO} />
          {errors.descricao && <p className="mt-1 text-xs text-red-600">{errors.descricao}</p>}
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
            {pending ? "Salvando…" : modo === "novo" ? "Enviar" : "Salvar"}
          </button>
        )}
        <Link href="/documentos" className="text-sm text-slate-600 underline hover:text-slate-900">
          Voltar à lista
        </Link>
      </div>
    </form>
  );
}
