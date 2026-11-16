"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  lerValoresPrazo,
  uuidOuNull,
  validarPrazo,
  type PrazoErrors,
  type PrazoValues,
} from "@/lib/prazos/validation";

export type PrazoFormState = { errors: PrazoErrors; values: PrazoValues } | undefined;

export async function salvarPrazo(
  _estadoAnterior: PrazoFormState,
  formData: FormData,
): Promise<PrazoFormState> {
  const user = await requirePermission("prazos:escrever");
  const values = lerValoresPrazo(formData);

  const { errors, payload } = validarPrazo(values);
  if (!payload) {
    return { errors, values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deadlines")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    return { errors: { geral: "Não foi possível salvar o prazo. Tente novamente." }, values };
  }
  redirect(`/prazos/${data.id}?salvo=1`);
}

// Confirmar aceita a data calculada pelo sistema (fica registrado quem confirmou e quando).
export async function confirmarPrazo(formData: FormData) {
  const user = await requirePermission("prazos:escrever");
  const id = uuidOuNull(formData.get("id"));
  if (!id) redirect("/prazos");

  const supabase = await createClient();
  const { data: prazo } = await supabase
    .from("deadlines")
    .select("vencimento_calculado")
    .eq("id", id)
    .eq("situacao", "pendente")
    .maybeSingle();
  if (!prazo) redirect(`/prazos/${id}?erro=situacao`);

  const { error } = await supabase
    .from("deadlines")
    .update({
      vencimento_confirmado: prazo.vencimento_calculado,
      situacao: "confirmado",
      confirmado_por: user.id,
      confirmado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("situacao", "pendente");

  if (error) redirect(`/prazos/${id}?erro=falha`);
  redirect(`/prazos/${id}?salvo=confirmado`);
}

// Correção manual exige nova data e justificativa; a data calculada original é mantida para auditoria.
export async function corrigirPrazo(formData: FormData) {
  const user = await requirePermission("prazos:escrever");
  const id = uuidOuNull(formData.get("id"));
  if (!id) redirect("/prazos");

  const nova = String(formData.get("vencimentoCorrigido") ?? "").trim();
  const justificativa = String(formData.get("justificativa") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nova) || !justificativa || justificativa.length > 500) {
    redirect(`/prazos/${id}?erro=correcao-invalida`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("deadlines")
    .update({
      vencimento_confirmado: nova,
      justificativa_correcao: justificativa,
      situacao: "confirmado",
      confirmado_por: user.id,
      confirmado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .in("situacao", ["pendente", "confirmado"]);

  if (error) redirect(`/prazos/${id}?erro=falha`);
  redirect(`/prazos/${id}?salvo=corrigido`);
}

export async function marcarCumprido(formData: FormData) {
  await requirePermission("prazos:escrever");
  const id = uuidOuNull(formData.get("id"));
  if (!id) redirect("/prazos");

  const supabase = await createClient();
  const { error } = await supabase
    .from("deadlines")
    .update({ situacao: "cumprido" })
    .eq("id", id)
    .eq("situacao", "confirmado");

  if (error) redirect(`/prazos/${id}?erro=falha`);
  redirect(`/prazos/${id}?salvo=cumprido`);
}

export async function cancelarPrazo(formData: FormData) {
  await requirePermission("prazos:escrever");
  const id = uuidOuNull(formData.get("id"));
  if (!id) redirect("/prazos");

  const supabase = await createClient();
  const { error } = await supabase
    .from("deadlines")
    .update({ situacao: "cancelado" })
    .eq("id", id)
    .in("situacao", ["pendente", "confirmado"]);

  if (error) redirect(`/prazos/${id}?erro=falha`);
  redirect(`/prazos/${id}?salvo=cancelado`);
}
