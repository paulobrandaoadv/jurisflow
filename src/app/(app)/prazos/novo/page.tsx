import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { carregarOpcoesVinculo } from "@/lib/vinculos/opcoes";
import { PRAZO_VAZIO } from "@/lib/prazos/validation";
import { PrazoForm } from "../prazo-form";

export default async function NovoPrazoPage() {
  await requirePermission("prazos:escrever");
  const supabase = await createClient();
  const opcoes = await carregarOpcoesVinculo(supabase);

  return (
    <main>
      <Link href="/prazos" className="text-sm text-slate-500 hover:text-slate-900">
        ← Voltar para prazos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Novo prazo</h1>
      <p className="mt-1 text-sm text-slate-500">
        O vencimento é calculado ao salvar e só vale depois de confirmado pelo advogado.
      </p>
      <PrazoForm initial={PRAZO_VAZIO} {...opcoes} />
    </main>
  );
}
