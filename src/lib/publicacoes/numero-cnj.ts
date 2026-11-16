// Siglas dos TJs na ordem do código TR (01 = AC ... 27 = TO), conforme a Resolução CNJ 65/2008.
const SIGLAS_TJ = [
  "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg", "pa", "pb",
  "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "se", "sp", "to",
];

export function somenteDigitos(numero: string): string {
  return numero.replace(/\D/g, "");
}

// Alias usado pela API pública do DataJud (api_publica_<alias>), derivado do segmento J.TR.
// Retorna null para ramos ainda não suportados.
export function aliasDatajud(numeroCnj: string): string | null {
  const digitos = somenteDigitos(numeroCnj);
  if (digitos.length !== 20) return null;

  const segmento = digitos[13];
  const tribunal = Number(digitos.slice(14, 16));

  if (segmento === "4" && tribunal >= 1 && tribunal <= 6) return `trf${tribunal}`;
  if (segmento === "5" && tribunal >= 1 && tribunal <= 24) return `trt${tribunal}`;
  if (segmento === "8" && tribunal >= 1 && tribunal <= SIGLAS_TJ.length) {
    return `tj${SIGLAS_TJ[tribunal - 1]}`;
  }
  return null;
}
