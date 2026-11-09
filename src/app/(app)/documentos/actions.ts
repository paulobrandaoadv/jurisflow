"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prepararArquivo } from "@/lib/documentos/compressao";
import { createClient } from "@/lib/supabase/server";
import {
  BUCKET_DOCUMENTOS,
  lerValoresDocumento,
  nomeSemExtensao,
  TAMANHO_MAXIMO_LOTE,
  TIPOS_PERMITIDOS,
  UUID_REGEX,
  validarArquivo,
  validarMetadados,
  type DocumentoErrors,
  type DocumentoPayload,
  type ValoresDocumento,
} from "@/lib/documentos/validation";

export type DocumentoFormState =
  | { errors: DocumentoErrors; values: ValoresDocumento }
  | undefined;

function uuidOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "");
  return UUID_REGEX.test(texto) ? texto : null;
}

function extensaoDoTipo(mime: string): string {
  return TIPOS_PERMITIDOS[mime] ?? "bin";
}

async function lerInicio(arquivo: File): Promise<Uint8Array> {
  return new Uint8Array(await arquivo.slice(0, 16).arrayBuffer());
}

async function gravarDocumento(
  arquivo: File,
  payload: DocumentoPayload,
  nome: string,
  criadoPor: string,
): Promise<{ id: string } | { erro: string }> {
  const supabase = await createClient();
  const original = new Uint8Array(await arquivo.arrayBuffer());
  const { bytes, mime } = await prepararArquivo(original, arquivo.type);
  const caminho = `${randomUUID()}.${extensaoDoTipo(mime)}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(caminho, new Blob([bytes], { type: mime }), { contentType: mime, upsert: false });
  if (erroUpload) return { erro: `Falha ao enviar ${arquivo.name}.` };

  const { data, error } = await supabase
    .from("documents")
    .insert({
      nome,
      nome_original: arquivo.name,
      categoria: payload.categoria,
      descricao: payload.descricao,
      tags: payload.tags,
      data_documento: payload.data_documento,
      client_id: payload.client_id,
      responsavel_id: payload.responsavel_id,
      storage_path: caminho,
      mime_type: mime,
      tamanho_bytes: bytes.length,
      created_by: criadoPor,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([caminho]);
    return { erro: `Falha ao registrar ${arquivo.name}.` };
  }

  if (payload.processoIds.length > 0) {
    const { error: erroVinculo } = await supabase.from("document_processes").insert(
      payload.processoIds.map((processId) => ({ document_id: data.id, process_id: processId })),
    );
    if (erroVinculo) {
      await supabase.from("documents").delete().eq("id", data.id);
      await supabase.storage.from(BUCKET_DOCUMENTOS).remove([caminho]);
      return { erro: `Falha ao vincular ${arquivo.name} aos processos.` };
    }
  }

  return { id: data.id };
}

export async function enviarDocumentos(
  _estadoAnterior: DocumentoFormState,
  formData: FormData,
): Promise<DocumentoFormState> {
  const user = await requirePermission("documentos:escrever");
  const values = lerValoresDocumento(formData);

  const arquivos = formData
    .getAll("arquivos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (arquivos.length === 0) {
    return { errors: { arquivos: "Selecione pelo menos um arquivo." }, values };
  }

  const totalBytes = arquivos.reduce((soma, a) => soma + a.size, 0);
  if (totalBytes > TAMANHO_MAXIMO_LOTE) {
    return { errors: { arquivos: "O envio passa de 50 MB no total. Envie em partes." }, values };
  }

  const { errors, payload } = validarMetadados(values, {
    nomeObrigatorio: arquivos.length === 1,
  });
  if (!payload) return { errors, values };

  for (const arquivo of arquivos) {
    const erro = validarArquivo(arquivo, await lerInicio(arquivo));
    if (erro) return { errors: { arquivos: erro }, values };
  }

  const salvos: string[] = [];
  for (const arquivo of arquivos) {
    const nome =
      arquivos.length === 1 && payload.nome ? payload.nome : nomeSemExtensao(arquivo.name);
    const resultado = await gravarDocumento(arquivo, payload, nome, user.id);
    if ("erro" in resultado) {
      const detalhe = salvos.length > 0 ? ` ${salvos.length} arquivo(s) anterior(es) foram salvos.` : "";
      return { errors: { geral: `${resultado.erro}${detalhe}` }, values };
    }
    salvos.push(resultado.id);
  }

  if (salvos.length === 1) {
    redirect(`/documentos/${salvos[0]}?enviado=1`);
  }
  redirect(`/documentos?enviados=${salvos.length}`);
}

export async function atualizarDocumento(
  _estadoAnterior: DocumentoFormState,
  formData: FormData,
): Promise<DocumentoFormState> {
  await requirePermission("documentos:escrever");

  const id = uuidOuNull(formData.get("id"));
  const values = lerValoresDocumento(formData);
  if (!id) {
    return { errors: { geral: "Documento inválido." }, values };
  }

  const { errors, payload } = validarMetadados(values, { nomeObrigatorio: true });
  if (!payload) return { errors, values };

  const { processoIds, ...campos } = payload;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .update(campos)
    .eq("id", id)
    .select("id");
  if (error) {
    return { errors: { geral: "Não foi possível salvar o documento. Tente novamente." }, values };
  }
  if (!data || data.length === 0) {
    return { errors: { geral: "Documento não encontrado." }, values };
  }

  const { error: erroRemover } = await supabase
    .from("document_processes")
    .delete()
    .eq("document_id", id);
  const { error: erroInserir } =
    erroRemover || processoIds.length === 0
      ? { error: erroRemover }
      : await supabase
          .from("document_processes")
          .insert(processoIds.map((processId) => ({ document_id: id, process_id: processId })));

  if (erroRemover || erroInserir) {
    return {
      errors: { geral: "Dados salvos, mas não foi possível atualizar os processos vinculados." },
      values,
    };
  }

  redirect(`/documentos/${id}?salvo=1`);
}

export async function excluirDocumento(formData: FormData) {
  await requirePermission("documentos:escrever");

  const id = uuidOuNull(formData.get("id"));
  if (!id) redirect("/documentos");

  const supabase = await createClient();
  const { data: documento, error: erroBusca } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (erroBusca) redirect(`/documentos/${id}?erro=falha-exclusao`);
  if (!documento) redirect("/documentos");

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) redirect(`/documentos/${id}?erro=falha-exclusao`);

  await supabase.storage.from(BUCKET_DOCUMENTOS).remove([documento.storage_path]);
  redirect("/documentos?excluido=1");
}
