const URL_DJEN = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const ITENS_POR_PAGINA = 100;
const MAX_PAGINAS = 50;

export type ComunicacaoDjen = {
  id: number;
  data_disponibilizacao: string;
  siglaTribunal?: string | null;
  tipoComunicacao?: string | null;
  nomeOrgao?: string | null;
  texto?: string | null;
  numero_processo?: string | null;
  link?: string | null;
};

// Busca comunicações do DJEN por número de OAB e período de disponibilização (AAAA-MM-DD).
export async function buscarComunicacoesDjen(
  oab: { numero: string; uf: string },
  inicio: string,
  fim: string,
): Promise<ComunicacaoDjen[]> {
  const resultados: ComunicacaoDjen[] = [];

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const parametros = new URLSearchParams({
      numeroOab: oab.numero,
      ufOab: oab.uf,
      dataDisponibilizacaoInicio: inicio,
      dataDisponibilizacaoFim: fim,
      itensPorPagina: String(ITENS_POR_PAGINA),
      pagina: String(pagina),
    });

    const resposta = await fetch(`${URL_DJEN}?${parametros}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (resposta.status === 429) throw new Error("DJEN: limite de requisições atingido.");
    if (!resposta.ok) throw new Error(`DJEN respondeu ${resposta.status}`);

    const corpo = (await resposta.json()) as { items?: ComunicacaoDjen[] };
    const itens = corpo.items ?? [];
    resultados.push(...itens);
    if (itens.length < ITENS_POR_PAGINA) break;
  }

  return resultados;
}
