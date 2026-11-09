import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando indicadores…</p>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  return (
    <main>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Indicadores reais do escritório.</p>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Clientes cadastrados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {error ? "—" : (count ?? 0)}
          </p>
          {error && <p className="mt-2 text-xs text-red-600">Não foi possível carregar.</p>}
        </div>
      </section>
    </main>
  );
}
