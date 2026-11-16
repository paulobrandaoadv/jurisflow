"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { lerValoresEvento, validarEvento, type EventoErrors, type EventoValues } from "@/lib/agenda/validation";
import { uuidOuNull } from "@/lib/prazos/validation";

export type EventoFormState = { errors: EventoErrors; values: EventoValues } | undefined;

export async function salvarEvento(
  _estadoAnterior: EventoFormState,
  formData: FormData,
): Promise<EventoFormState> {
  const user = await requirePermission("agenda:escrever");
  const values = lerValoresEvento(formData);

  const { errors, payload } = validarEvento(values);
  if (!payload) {
    return { errors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("agenda_events").insert({ ...payload, created_by: user.id });
  if (error) {
    return { errors: { geral: "Não foi possível salvar o compromisso. Tente novamente." }, values };
  }
  redirect("/agenda?salvo=1");
}

export async function atualizarSituacaoEvento(formData: FormData) {
  await requirePermission("agenda:escrever");
  const id = uuidOuNull(formData.get("id"));
  const situacao = String(formData.get("situacao") ?? "");
  const mes = String(formData.get("mes") ?? "");
  const destino = /^\d{4}-\d{2}$/.test(mes) ? `/agenda?mes=${mes}` : "/agenda";

  if (!id || !["realizado", "cancelado"].includes(situacao)) redirect(destino);

  const supabase = await createClient();
  await supabase
    .from("agenda_events")
    .update({ situacao })
    .eq("id", id)
    .eq("situacao", "agendado");

  redirect(destino);
}
