import { aliasDatajud, somenteDigitos } from "@/lib/publicacoes/numero-cnj";

const URL_DATAJUD = "https://api-publica.datajud.cnj.jus.br";

export type MovimentoDatajud = {
  codigo: number | null;
  nome: string;
  dataHora: string;
};

export type ResultadoDatajud =
  | { ok: true; movimentos: MovimentoDatajud[] }
  | { ok: false; motivo: "sem-chave" | "tribunal-nao-suportado" | "nao-encontrado" | "falha" };

// Consulta os movimentos mais recentes do processo na API pública do DataJud (CNJ).
export async function buscarMovimentosDatajud(numeroCnj: string): Promise<ResultadoDatajud> {
  const chave = process.env.DATAJUD_API_KEY;
  if (!chave) return { ok: false, motivo: "sem-chave" };

  const numero = somenteDigitos(numeroCnj);
  const alias = aliasDatajud(numero);
  if (!alias) return { ok: false, motivo: "tribunal-nao-suportado" };

  try {
    const resposta = await fetch(`${URL_DATAJUD}/api_publica_${alias}/_search`, {
      method: "POST",
      headers: {
        Authorization: `APIKey ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { match: { numeroProcesso: numero } } }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!resposta.ok) return { ok: false, motivo: "falha" };

    const corpo = (await resposta.json()) as {
      hits?: { hits?: { _source?: { movimentos?: MovimentoDatajud[] } }[] };
    };
    const processo = corpo.hits?.hits?.[0]?._source;
    if (!processo) return { ok: false, motivo: "nao-encontrado" };

    const movimentos = [...(processo.movimentos ?? [])]
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
      .slice(0, 15);
    return { ok: true, movimentos };
  } catch {
    return { ok: false, motivo: "falha" };
  }
}
