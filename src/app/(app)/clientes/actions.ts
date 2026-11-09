"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  lerValoresCliente,
  validarCliente,
  type ClienteErrors,
  type ClienteValues,
} from "@/lib/clients/validation";

export type ClienteFormState =
  | { errors: ClienteErrors; values: ClienteValues }
  | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function salvarCliente(
  _estadoAnterior: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  const user = await requirePermission("clientes:escrever");

  const id = String(formData.get("id") ?? "");
  const values = lerValoresCliente(formData);

  if (id && !UUID.test(id)) {
    return { errors: { geral: "Cliente inválido." }, values };
  }

  const { errors, payload } = validarCliente(values);
  if (!payload) {
    return { errors, values };
  }

  const supabase = await createClient();

  if (id) {
    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", id)
      .select("id");
    if (error) return tratarErro(error.code, values);
    if (!data || data.length === 0) {
      return { errors: { geral: "Cliente não encontrado." }, values };
    }
  } else {
    const { error } = await supabase
      .from("clients")
      .insert({ ...payload, created_by: user.id })
      .select("id")
      .single();
    if (error) return tratarErro(error.code, values);
  }

  redirect("/clientes?salvo=1");
}

function tratarErro(codigo: string | undefined, values: ClienteValues): ClienteFormState {
  if (codigo === "23505") {
    return { errors: { cpfCnpj: "Já existe cliente cadastrado com este CPF/CNPJ." }, values };
  }
  return {
    errors: { geral: "Não foi possível salvar o cliente. Tente novamente." },
    values,
  };
}
