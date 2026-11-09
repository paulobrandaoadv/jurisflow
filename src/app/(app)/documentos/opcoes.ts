import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function carregarOpcoesDocumento(supabase: Supabase) {
  const [{ data: clientes }, { data: processos }, { data: equipe }] = await Promise.all([
    supabase.from("clients").select("id, nome").order("nome").limit(500),
    supabase.from("processes").select("id, numero_cnj, assunto").order("created_at", { ascending: false }).limit(500),
    supabase.rpc("equipe_ativa"),
  ]);

  return {
    clientes: (clientes ?? []).map((c) => ({ id: c.id, rotulo: c.nome })),
    processos: (processos ?? []).map((p) => ({
      id: p.id,
      rotulo: [p.numero_cnj ?? "Sem número CNJ", p.assunto].filter(Boolean).join(" · "),
    })),
    equipe: ((equipe ?? []) as { id: string; name: string }[]).map((m) => ({ id: m.id, rotulo: m.name })),
  };
}
