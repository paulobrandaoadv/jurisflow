export const TIPOS_CONTAGEM = ["uteis", "corridos", "manual"] as const;
export type TipoContagem = (typeof TIPOS_CONTAGEM)[number];

export const ROTULOS_CONTAGEM: Record<TipoContagem, string> = {
  uteis: "Dias úteis (CPC)",
  corridos: "Dias corridos",
  manual: "Data informada manualmente",
};

export type ResultadoPrazo = {
  dataInicial: string;
  vencimento: string;
  diasContados: number;
  regra: string;
  feriados: string[];
  suspensoes: string[];
};

const DIA_MS = 86_400_000;

// Feriados nacionais fixos (MM-DD). Feriados estaduais, municipais e o calendário do tribunal não são considerados.
const FERIADOS_NACIONAIS = [
  "01-01",
  "04-21",
  "05-01",
  "09-07",
  "10-12",
  "11-02",
  "11-15",
  "11-20",
  "12-25",
];

function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function paraIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function ehFeriadoNacional(iso: string): boolean {
  return FERIADOS_NACIONAIS.includes(iso.slice(5));
}

// Recesso forense: suspensão de 20/12 a 20/01 (CPC, art. 220).
export function ehRecessoForense(iso: string): boolean {
  const mmdd = iso.slice(5);
  return mmdd >= "12-20" || mmdd <= "01-20";
}

function ehFimDeSemana(iso: string): boolean {
  const dia = paraData(iso).getUTCDay();
  return dia === 0 || dia === 6;
}

function ehDiaUtil(iso: string): boolean {
  return !ehFimDeSemana(iso) && !ehFeriadoNacional(iso) && !ehRecessoForense(iso);
}

/**
 * Calcula o vencimento a partir do marco inicial. O dia do marco não conta (CPC, art. 224).
 * - uteis: conta apenas dias úteis, pulando fins de semana, feriados nacionais e recesso forense.
 * - corridos: conta dias corridos; se o último dia não for útil, prorroga para o próximo dia útil.
 */
export function calcularPrazo(
  marcoInicial: string,
  dias: number,
  tipo: Exclude<TipoContagem, "manual">,
): ResultadoPrazo {
  if (!Number.isInteger(dias) || dias < 1) {
    throw new RangeError("A quantidade de dias deve ser um inteiro maior que zero.");
  }

  const feriados: string[] = [];
  const suspensoes: string[] = [];
  let atual = paraData(marcoInicial);
  let contados = 0;
  let vencimento: string | null = null;

  while (vencimento === null) {
    atual = new Date(atual.getTime() + DIA_MS);
    const iso = paraIso(atual);
    const util = ehDiaUtil(iso);

    if (!util) {
      if (ehRecessoForense(iso)) suspensoes.push(iso);
      else if (ehFeriadoNacional(iso)) feriados.push(iso);
    }

    if (tipo === "uteis") {
      if (util) contados++;
      if (contados === dias) vencimento = iso;
    } else {
      contados++;
      if (contados >= dias && util) vencimento = iso;
    }
  }

  const regra =
    tipo === "uteis"
      ? "Dias úteis (CPC, arts. 219 e 224): exclui o dia do marco inicial, sábados, domingos, feriados nacionais e recesso forense (20/12 a 20/01, art. 220)."
      : "Dias corridos (CPC, art. 224, §1º): exclui o dia do marco inicial; se o último dia cair em fim de semana, feriado ou recesso, prorroga para o próximo dia útil.";

  return {
    dataInicial: paraIso(new Date(paraData(marcoInicial).getTime() + DIA_MS)),
    vencimento,
    diasContados: dias,
    regra,
    feriados,
    suspensoes,
  };
}
