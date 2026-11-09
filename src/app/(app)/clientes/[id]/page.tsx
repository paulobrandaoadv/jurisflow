import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "@/app/(app)/clientes/client-form";
import { formatarDocumento } from "@/lib/clients/documento";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <EditarCliente params={params} />
    </Suspense>
  );
}

async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const user = await requirePermission("clientes:ler");
  const podeEscrever = can(user.role, "clientes:escrever");

  const supabase = await createClient();
  const { data: cliente, error } = await supabase
    .from("clients")
    .select("id, tipo, nome, cpf_cnpj, email, telefone, observacoes")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <p className="text-sm text-red-600">Não foi possível carregar o cliente.</p>;
  }
  if (!cliente) notFound();

  return (
    <main>
      <h1 className="text-2xl font-semibold text-slate-900">{cliente.nome}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {podeEscrever ? "Edite os dados do cliente." : "Somente leitura para o seu perfil."}
      </p>
      <ClienteForm
        id={cliente.id}
        readOnly={!podeEscrever}
        initial={{
          tipo: cliente.tipo,
          nome: cliente.nome,
          cpfCnpj: formatarDocumento(cliente.cpf_cnpj),
          email: cliente.email ?? "",
          telefone: cliente.telefone ?? "",
          observacoes: cliente.observacoes ?? "",
        }}
      />
    </main>
  );
}
