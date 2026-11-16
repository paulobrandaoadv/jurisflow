import { executarAlertasPrazos } from "@/lib/prazos/alertas-job";

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  try {
    const resultado = await executarAlertasPrazos();
    return Response.json(resultado);
  } catch (erro) {
    console.error("Alertas de prazo:", erro);
    return Response.json({ erro: "Falha ao processar alertas." }, { status: 500 });
  }
}
