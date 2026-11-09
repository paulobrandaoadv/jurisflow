import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ClienteForm } from "@/app/(app)/clientes/client-form";
import { VALORES_CLIENTE_VAZIOS } from "@/lib/clients/validation";

export default function NovoClientePage() {
  return (
    <Suspense fallback={null}>
      <NovoCliente />
    </Suspense>
  );
}

async function NovoCliente() {
  await connection();
  const user = await requireUser();

  if (!can(user.role, "clientes:escrever")) {
    return (
      <main>
        <h1 className="text-2xl font-semibold text-slate-900">Novo cliente</h1>
        <p className="mt-4 text-sm text-slate-600">
          Seu perfil não tem permissão para cadastrar clientes.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold text-slate-900">Novo cliente</h1>
      <p className="mt-1 text-sm text-slate-500">Informe os dados e o CPF/CNPJ com dígitos válidos.</p>
      <ClienteForm initial={VALORES_CLIENTE_VAZIOS} readOnly={false} />
    </main>
  );
}
