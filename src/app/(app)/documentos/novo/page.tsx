import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DocumentoForm } from "@/app/(app)/documentos/documento-form";
import { carregarOpcoesDocumento } from "@/app/(app)/documentos/opcoes";

export default function NovoDocumentoPage() {
  return (
    <Suspense fallback={null}>
      <Novo />
    </Suspense>
  );
}

async function Novo() {
  await connection();
  await requirePermission("documentos:escrever");
  const supabase = await createClient();
  const opcoes = await carregarOpcoesDocumento(supabase);

  return (
    <main>
      <Link href="/documentos" className="text-sm text-slate-600 underline hover:text-slate-900">
        Voltar à lista de documentos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Novo documento</h1>
      <p className="mt-1 text-sm text-slate-500">
        Envie um ou vários arquivos. Com vários arquivos, o nome de cada um vem do nome do arquivo.
      </p>
      <DocumentoForm
        modo="novo"
        readOnly={false}
        initial={{
          nome: "",
          categoria: "",
          descricao: "",
          tags: "",
          dataDocumento: "",
          clienteId: "",
          responsavelId: "",
          processoIds: [],
        }}
        {...opcoes}
      />
    </main>
  );
}
