"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  lerValoresProcesso,
  POLOS,
  validarProcesso,
  type ProcessoErrors,
  type ProcessoValues,
} from "@/lib/processos/validation";

export type ProcessoFormState =
  | { errors: ProcessoErrors; values: ProcessoValues }
  | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "");
  return UUID.test(texto) ? texto : null;
}

export async function salvarProcesso(
  _estadoAnterior: ProcessoFormState,
  formData: FormData,
): Promise<ProcessoFormState> {
  const user = await requirePermission("processos:escrever");

  const id = String(formData.get("id") ?? "");
  const values = lerValoresProcesso(formData);

  if (id && !UUID.test(id)) {
    return { errors: { geral: "Processo inválido." }, values };
  }

  const { errors, payload } = validarProcesso(values);
  if (!payload) {
    return { errors, values };
  }

  const supabase = await createClient();

  if (id) {
    const { data, error } = await supabase
      .from("processes")
      .update(payload)
      .eq("id", id)
      .select("id");
    if (error) return tratarErroProcesso(error.code, values);
    if (!data || data.length === 0) {
      return { errors: { geral: "Processo não encontrado." }, values };
    }
    redirect(`/processos/${id}?salvo=1`);
  }

  const { data, error } = await supabase
    .from("processes")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (error) return tratarErroProcesso(error.code, values);

  redirect(`/processos/${data.id}?salvo=1`);
}

function tratarErroProcesso(codigo: string | undefined, values: ProcessoValues): ProcessoFormState {
  if (codigo === "23505") {
    return { errors: { numeroCnj: "Já existe processo cadastrado com este número CNJ." }, values };
  }
  return {
    errors: { geral: "Não foi possível salvar o processo. Tente novamente." },
    values,
  };
}

export async function vincularCliente(formData: FormData) {
  await requirePermission("processos:escrever");

  const processoId = uuidOuNull(formData.get("processoId"));
  const clienteId = uuidOuNull(formData.get("clienteId"));
  const polo = String(formData.get("polo") ?? "outro");
  if (!processoId || !clienteId) {
    redirect("/processos");
  }
  const poloValido = (POLOS as readonly string[]).includes(polo) ? polo : "outro";

  const supabase = await createClient();
  const { error } = await supabase
    .from("process_clients")
    .insert({ process_id: processoId, client_id: clienteId, polo: poloValido });

  if (error) {
    const codigo = error.code === "23505" ? "cliente-ja-vinculado" : "falha-vinculo";
    redirect(`/processos/${processoId}?erro=${codigo}`);
  }
  redirect(`/processos/${processoId}`);
}

export async function desvincularCliente(formData: FormData) {
  await requirePermission("processos:escrever");

  const processoId = uuidOuNull(formData.get("processoId"));
  const clienteId = uuidOuNull(formData.get("clienteId"));
  if (!processoId || !clienteId) {
    redirect("/processos");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("process_clients")
    .delete()
    .eq("process_id", processoId)
    .eq("client_id", clienteId);

  if (error) redirect(`/processos/${processoId}?erro=falha-vinculo`);
  redirect(`/processos/${processoId}`);
}

export async function vincularAdvogado(formData: FormData) {
  await requirePermission("processos:escrever");

  const processoId = uuidOuNull(formData.get("processoId"));
  const profileId = uuidOuNull(formData.get("profileId"));
  if (!processoId || !profileId) {
    redirect("/processos");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("process_members")
    .insert({ process_id: processoId, profile_id: profileId });

  if (error) {
    const codigo = error.code === "23505" ? "advogado-ja-vinculado" : "falha-vinculo";
    redirect(`/processos/${processoId}?erro=${codigo}`);
  }
  redirect(`/processos/${processoId}`);
}

export async function desvincularAdvogado(formData: FormData) {
  await requirePermission("processos:escrever");

  const processoId = uuidOuNull(formData.get("processoId"));
  const profileId = uuidOuNull(formData.get("profileId"));
  if (!processoId || !profileId) {
    redirect("/processos");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("process_members")
    .delete()
    .eq("process_id", processoId)
    .eq("profile_id", profileId);

  if (error) redirect(`/processos/${processoId}?erro=falha-vinculo`);
  redirect(`/processos/${processoId}`);
}

export async function adicionarMovimentacao(formData: FormData) {
  const user = await requirePermission("processos:escrever");

  const processoId = uuidOuNull(formData.get("processoId"));
  if (!processoId) {
    redirect("/processos");
  }

  const data = String(formData.get("data") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !titulo || titulo.length > 200) {
    redirect(`/processos/${processoId}?erro=movimentacao-invalida`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("process_movements").insert({
    process_id: processoId,
    data,
    titulo,
    descricao: descricao || null,
    origem: "manual",
    responsavel_id: user.id,
  });

  if (error) redirect(`/processos/${processoId}?erro=falha-movimentacao`);
  redirect(`/processos/${processoId}`);
}
