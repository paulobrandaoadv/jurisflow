import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DocumentoForm } from "@/app/(app)/documentos/documento-form";
import { carregarOpcoesDocumento } from "@/app/(app)/documentos/opcoes";
import { excluirDocumento } from "@/app/(app)/documentos/actions";
import { ConfirmSubmit } from "@/app/(app)/processos/[id]/confirm-submit";
import { ROTULOS_CATEGORIA, UUID_REGEX, type Categoria } from "@/lib/documentos/validation";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ salvo?: string; enviado?: string; erro?: string }>;

const MENSAGENS: Record<string, string> = {
  salvo: "Alterações salvas.",
  enviado: "Documento enviado.",
};

const MENSAGENS_ERRO: Record<string, string> = {
  "falha-exclusao": "Não foi possível excluir o documento. Tente novamente.",
};

export default function DocumentoPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <DetalheDocumento params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DetalheDocumento({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  await connection();
  const { id } = await params;
  const { salvo, enviado, erro } = await searchParams;
  if (!UUID_REGEX.test(id)) notFound();

  const user = await requirePermission("documentos:ler");
  const podeEscrever = can(user.role, "documentos:escrever");

  const supabase = await createClient();
  const { data: documento, error } = await supabase
    .from("documents")
    .select("id, nome, nome_original, categoria, descricao, tags, data_documento, client_id, responsavel_id, mime_type, tamanho_bytes, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <p className="text-sm text-red-600">Não foi possível carregar o documento.</p>;
  }
  if (!documento) notFound();

  const [{ data: vinculos }, opcoes] = await Promise.all([
    supabase.from("document_processes").select("process_id").eq("document_id", id),
    podeEscrever ? carregarOpcoesDocumento(supabase) : Promise.resolve(null),
  ]);

  const mensagem = salvo ? MENSAGENS.salvo : enviado ? MENSAGENS.enviado : null;
  const processoIds = (vinculos ?? []).map((v) => v.process_id);
  const tamanhoMb = (Number(documento.tamanho_bytes) / (1024 * 1024)).toFixed(2).replace(".", ",");

  return (
    <main>
      <Link href="/documentos" className="text-sm text-slate-600 underline hover:text-slate-900">
        Voltar à lista de documentos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{documento.nome}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {ROTULOS_CATEGORIA[documento.categoria as Categoria] ?? documento.categoria} · {documento.nome_original} ·{" "}
        {tamanhoMb} MB
      </p>

      {mensagem && (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          {mensagem}
        </p>
      )}
      {erro && MENSAGENS_ERRO[erro] && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {MENSAGENS_ERRO[erro]}
        </p>
      )}

      <div className="mt-4 flex gap-4 text-sm">
        <a href={`/documentos/${id}/arquivo`} target="_blank" rel="noopener noreferrer" className="text-slate-700 underline">
          Abrir arquivo
        </a>
        <a href={`/documentos/${id}/arquivo?download=1`} className="text-slate-700 underline">
          Baixar
        </a>
      </div>

      {opcoes ? (
        <>
          <DocumentoForm
            id={id}
            modo="editar"
            readOnly={false}
            initial={{
              nome: documento.nome,
              categoria: documento.categoria,
              descricao: documento.descricao ?? "",
              tags: (documento.tags ?? []).join(", "),
              dataDocumento: documento.data_documento ?? "",
              clienteId: documento.client_id ?? "",
              responsavelId: documento.responsavel_id ?? "",
              processoIds,
            }}
            {...opcoes}
          />
          <form action={excluirDocumento} className="mt-6 max-w-3xl">
            <input type="hidden" name="id" value={id} />
            <ConfirmSubmit mensagem="Excluir este documento e o arquivo? Esta ação não pode ser desfeita.">
              Excluir documento
            </ConfirmSubmit>
          </form>
        </>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Somente leitura para o seu perfil.</p>
      )}
    </main>
  );
}
