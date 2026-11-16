import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { carregarOpcoesVinculo } from "@/lib/vinculos/opcoes";
import { EVENTO_VAZIO } from "@/lib/agenda/validation";
import { hojeSaoPaulo } from "@/lib/prazos/validation";
import { EventoForm } from "../evento-form";

export default async function NovoEventoPage() {
  await requirePermission("agenda:escrever");
  const supabase = await createClient();
  const opcoes = await carregarOpcoesVinculo(supabase);

  return (
    <main>
      <Link href="/agenda" className="text-sm text-slate-500 hover:text-slate-900">
        ← Voltar para a agenda
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Novo compromisso</h1>
      <EventoForm initial={{ ...EVENTO_VAZIO, data: hojeSaoPaulo() }} {...opcoes} />
    </main>
  );
}
