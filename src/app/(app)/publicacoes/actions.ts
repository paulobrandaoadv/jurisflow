"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const STATUS_VALIDOS = ["tratada", "ignorada", "nova"] as const;
type StatusPublicacao = (typeof STATUS_VALIDOS)[number];

// Marca a publicação como tratada, ignorada ou devolve para nova; quem tratou e quando ficam registrados.
export async function alterarStatusPublicacao(formData: FormData) {
  const user = await requirePermission("publicacoes:escrever");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as StatusPublicacao;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUS_VALIDOS.includes(status)) return;

  const supabase = await createClient();
  const alteracao =
    status === "nova"
      ? { status, tratada_por: null, tratada_em: null }
      : { status, tratada_por: user.id, tratada_em: new Date().toISOString() };

  const { error } = await supabase.from("publicacoes").update(alteracao).eq("id", id);
  if (error) throw new Error("Não foi possível atualizar a publicação.");
  revalidatePath("/publicacoes");
}
