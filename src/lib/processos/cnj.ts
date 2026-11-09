export const FORMATO_CNJ = /^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/;

export function calcularDvCnj(
  sequencial: string,
  ano: string,
  segmento: string,
  tribunal: string,
  origem: string,
): string {
  const corpo = `${sequencial}${ano}${segmento}${tribunal}${origem}00`;
  let resto = 0;
  for (const digito of corpo) {
    resto = (resto * 10 + Number(digito)) % 97;
  }
  return String(98 - resto).padStart(2, "0");
}

export function isNumeroCnjValido(numero: string): boolean {
  const partes = FORMATO_CNJ.exec(numero);
  if (!partes) return false;
  const [, sequencial, dv, ano, segmento, tribunal, origem] = partes;
  return calcularDvCnj(sequencial, ano, segmento, tribunal, origem) === dv;
}
