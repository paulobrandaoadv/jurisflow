export const MOMENTOS_ALERTA = ["7_dias", "3_dias", "2_dias", "1_dia", "dia", "vencido"] as const;
export type MomentoAlerta = (typeof MOMENTOS_ALERTA)[number];

export const ROTULOS_MOMENTO_ALERTA: Record<MomentoAlerta, string> = {
  "7_dias": "vence em 7 dias",
  "3_dias": "vence em 3 dias",
  "2_dias": "vence em 2 dias",
  "1_dia": "vence amanhã",
  dia: "vence hoje",
  vencido: "venceu",
};

const MOMENTO_POR_DIAS: Partial<Record<number, MomentoAlerta>> = {
  7: "7_dias",
  3: "3_dias",
  2: "2_dias",
  1: "1_dia",
  0: "dia",
};

// Dias negativos (prazo já vencido) geram um único alerta, marcado como "vencido".
export function momentoDoAlerta(diasAteVencimento: number): MomentoAlerta | null {
  if (diasAteVencimento < 0) return "vencido";
  return MOMENTO_POR_DIAS[diasAteVencimento] ?? null;
}
