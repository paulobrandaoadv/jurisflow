import { createClient } from "@supabase/supabase-js";
import {
  momentoDoAlerta,
  ROTULOS_MOMENTO_ALERTA,
  type MomentoAlerta,
} from "@/lib/prazos/alertas";
import { diasAte, formatarData, hojeSaoPaulo, vencimentoEfetivo } from "@/lib/prazos/validation";

type PrazoConfirmado = {
  id: string;
  descricao: string;
  vencimento_calculado: string;
  vencimento_confirmado: string | null;
};

type Pendente = {
  id: string;
  descricao: string;
  vencimento: string;
  momento: MomentoAlerta;
};

function lerConfiguracao() {
  const env = {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    resendKey: process.env.RESEND_API_KEY,
    destinos: process.env.ALERTA_EMAIL_DESTINO,
    remetente: process.env.ALERTA_EMAIL_REMETENTE ?? "JurisFlow <onboarding@resend.dev>",
  };
  if (!env.url || !env.serviceKey || !env.resendKey || !env.destinos) {
    throw new Error("Variáveis de alerta não configuradas (Supabase, Resend ou destinatário).");
  }
  return {
    url: env.url,
    serviceKey: env.serviceKey,
    resendKey: env.resendKey,
    destinos: env.destinos.split(",").map((e) => e.trim()).filter(Boolean),
    remetente: env.remetente,
  };
}

function montarEmail(pendentes: Pendente[]) {
  const linhas = pendentes.map(
    (p) => `- ${formatarData(p.vencimento)} — ${p.descricao} (${ROTULOS_MOMENTO_ALERTA[p.momento]})`,
  );
  return {
    subject: `JurisFlow: ${pendentes.length} alerta(s) de prazo`,
    text: ["Prazos que precisam de atenção:", "", ...linhas, "", "Acesse o JurisFlow para ver os detalhes."].join("\n"),
  };
}

export async function executarAlertasPrazos() {
  const config = lerConfiguracao();
  const admin = createClient(config.url, config.serviceKey, { auth: { persistSession: false } });

  const { data, error } = await admin
    .from("deadlines")
    .select("id, descricao, vencimento_calculado, vencimento_confirmado")
    .eq("situacao", "confirmado")
    .limit(1000);
  if (error) throw new Error(`Falha ao ler prazos: ${error.message}`);

  const hoje = hojeSaoPaulo();
  const candidatos: Pendente[] = [];
  for (const prazo of (data ?? []) as PrazoConfirmado[]) {
    const vencimento = vencimentoEfetivo(prazo);
    const momento = momentoDoAlerta(diasAte(vencimento, hoje));
    if (momento) candidatos.push({ id: prazo.id, descricao: prazo.descricao, vencimento, momento });
  }
  if (candidatos.length === 0) return { enviados: 0 };

  const { data: enviados, error: erroAlertas } = await admin
    .from("deadline_alerts")
    .select("deadline_id, momento, vencimento")
    .in("deadline_id", candidatos.map((c) => c.id));
  if (erroAlertas) throw new Error(`Falha ao ler alertas: ${erroAlertas.message}`);

  const jaEnviados = new Set(
    (enviados ?? []).map((a) => `${a.deadline_id}|${a.momento}|${a.vencimento}`),
  );
  const pendentes = candidatos.filter(
    (c) => !jaEnviados.has(`${c.id}|${c.momento}|${c.vencimento}`),
  );
  if (pendentes.length === 0) return { enviados: 0 };

  const email = montarEmail(pendentes);
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: config.remetente, to: config.destinos, ...email }),
  });
  if (!resposta.ok) throw new Error(`Resend respondeu ${resposta.status}`);

  const { error: erroRegistro } = await admin.from("deadline_alerts").insert(
    pendentes.map((p) => ({ deadline_id: p.id, momento: p.momento, vencimento: p.vencimento })),
  );
  if (erroRegistro) throw new Error(`E-mail enviado, mas falhou ao registrar: ${erroRegistro.message}`);

  return { enviados: pendentes.length };
}
