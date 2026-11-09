import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ProcessoForm } from "@/app/(app)/processos/process-form";
import { VALORES_PROCESSO_VAZIOS } from "@/lib/processos/validation";

export default function NovoProcessoPage() {
  return (
    <Suspense fallback={null}>
      <NovoProcesso />
    </Suspense>
  );
}

async function NovoProcesso() {
  await connection();
  const user = await requireUser();

  if (!can(user.role, "processos:escrever")) {
    return (
      <main>
        <h1 className="text-2xl font-semibold text-slate-900">Novo processo</h1>
        <p className="mt-4 text-sm text-slate-600">
          Seu perfil não tem permissão para cadastrar processos.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold text-slate-900">Novo processo</h1>
      <p className="mt-1 text-sm text-slate-500">
        Informe o número CNJ com dígito verificador válido, ou deixe em branco para processos administrativos.
      </p>
      <ProcessoForm initial={VALORES_PROCESSO_VAZIOS} readOnly={false} />
    </main>
  );
}
