import { createClient } from "@supabase/supabase-js";
import { buscarComunicacoesDjen, type ComunicacaoDjen } from "@/lib/publicacoes/djen";
import { somenteDigitos } from "@/lib/publicacoes/numero-cnj";
import { hojeSaoPaulo } from "@/lib/prazos/validation";

const DIAS_DE_JANELA = 7;

function lerConfiguracao() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const numero = process.env.DJEN_OAB_NUMERO;
  const uf = process.env.DJEN_OAB_UF;
  if (!url || !serviceKey || !numero || !uf) {
    throw new Error("Variáveis do DJEN não configuradas (Supabase, DJEN_OAB_NUMERO ou DJEN_OAB_UF).");
  }
  return { url, serviceKey, oab: { numero, uf } };
}

// Data ISO (AAAA-MM-DD) deslocada em dias, sem depender do fuso do servidor.
function diaDeslocado(iso: string, dias: number): string {
  const data = new Date(`${iso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export async function sincronizarDjen() {
  const config = lerConfiguracao();
  const admin = createClient(config.url, config.serviceKey, { auth: { persistSession: false } });

  const hoje = hojeSaoPaulo();
  const comunicacoes: ComunicacaoDjen[] = await buscarComunicacoesDjen(
    config.oab,
    diaDeslocado(hoje, -DIAS_DE_JANELA),
    hoje,
  );

  const { data: processos, error: erroProcessos } = await admin
    .from("processes")
    .select("id, numero_cnj")
    .not("numero_cnj", "is", null);
  if (erroProcessos) throw new Error(`Falha ao ler processos: ${erroProcessos.message}`);

  const processoPorNumero = new Map<string, string>(
    (processos ?? []).map((p) => [somenteDigitos(p.numero_cnj as string), p.id as string]),
  );

  const linhas = comunicacoes
    .map((c) => ({ c, numero: somenteDigitos(c.numero_processo ?? "") }))
    .filter(({ numero }) => numero.length === 20)
    .map(({ c, numero }) => ({
      comunicacao_id: c.id,
      numero_processo: numero,
      sigla_tribunal: c.siglaTribunal ?? null,
      data_disponibilizacao: c.data_disponibilizacao,
      tipo_comunicacao: c.tipoComunicacao ?? null,
      nome_orgao: c.nomeOrgao ?? null,
      texto: c.texto ?? null,
      link: c.link || null,
      process_id: processoPorNumero.get(numero) ?? null,
    }));

  if (linhas.length > 0) {
    // ignoreDuplicates preserva o status (tratada/ignorada) já definido pelo usuário.
    const { error } = await admin
      .from("publicacoes")
      .upsert(linhas, { onConflict: "comunicacao_id", ignoreDuplicates: true });
    if (error) throw new Error(`Falha ao gravar publicações: ${error.message}`);
  }

  // Vincula publicações antigas a processos cadastrados depois da importação.
  for (const [numero, processoId] of processoPorNumero) {
    await admin
      .from("publicacoes")
      .update({ process_id: processoId })
      .eq("numero_processo", numero)
      .is("process_id", null);
  }

  return { recebidas: comunicacoes.length, gravadas: linhas.length };
}
