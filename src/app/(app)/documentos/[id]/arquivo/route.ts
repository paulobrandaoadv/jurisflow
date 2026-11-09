import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS, UUID_REGEX, VALIDADE_LINK_SEGUNDOS } from "@/lib/documentos/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!can(user.role, "documentos:ler")) {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const supabase = await createClient();
  const { data: documento, error } = await supabase
    .from("documents")
    .select("storage_path, nome_original")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ erro: "Falha ao localizar o arquivo." }, { status: 500 });
  if (!documento) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const baixar = request.nextUrl.searchParams.get("download") === "1";
  const { data, error: erroLink } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(
      documento.storage_path,
      VALIDADE_LINK_SEGUNDOS,
      baixar ? { download: documento.nome_original } : undefined,
    );
  if (erroLink || !data) {
    return NextResponse.json({ erro: "Falha ao gerar o link do arquivo." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
