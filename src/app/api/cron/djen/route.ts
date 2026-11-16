import { sincronizarDjen } from "@/lib/publicacoes/sincronizacao-job";

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  try {
    const resultado = await sincronizarDjen();
    return Response.json(resultado);
  } catch (erro) {
    console.error("Sincronização DJEN:", erro);
    return Response.json({ erro: "Falha ao sincronizar publicações." }, { status: 500 });
  }
}
