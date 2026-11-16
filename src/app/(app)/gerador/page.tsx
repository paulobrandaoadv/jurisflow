import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { CAMPOS_MODELO } from "@/lib/gerador/modelo";
import { MODELOS } from "@/lib/gerador/modelos";

export default function GeradorPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando…</p>}>
      <GeradorContent />
    </Suspense>
  );
}

async function GeradorContent() {
  await connection();
  await requirePermission("processos:ler");

  return (
    <main>
      <h1 className="text-2xl font-semibold text-white">Gerador de documentos</h1>
      <p className="mt-1 text-sm text-slate-400">
        Gera petições, procurações e contratos a partir de modelos, preenchendo os dados do cliente e do processo.
      </p>

      <section className="mt-6 rounded-xl border border-white/5 bg-[#111a2e] p-5">
        <h2 className="font-semibold text-white">Modelos</h2>
        {MODELOS.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nenhum modelo cadastrado ainda. Os modelos serão adicionados em seguida.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {MODELOS.map((modelo) => (
              <li key={modelo.id} className="py-3">
                <p className="text-sm font-medium text-slate-100">{modelo.titulo}</p>
                <p className="text-xs text-slate-500">{modelo.descricao}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-white/5 bg-[#111a2e] p-5">
        <h2 className="font-semibold text-white">Campos disponíveis</h2>
        <p className="mt-1 text-xs text-slate-500">
          Use estes marcadores nos modelos. Campos sem dado no cadastro ficam sinalizados antes da geração.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {CAMPOS_MODELO.map((campo) => (
            <li key={campo.chave} className="text-sm">
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-blue-300">{`{{${campo.chave}}}`}</code>
              <span className="ml-2 text-slate-400">{campo.descricao}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
