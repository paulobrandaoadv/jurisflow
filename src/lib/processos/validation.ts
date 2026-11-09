import { isNumeroCnjValido } from "@/lib/processos/cnj";

export const GRAUS = ["primeiro", "segundo", "superior", "administrativo"] as const;
export const SITUACOES = ["ativo", "suspenso", "arquivado", "encerrado"] as const;
export const FASES = ["conhecimento", "recursal", "execucao", "outra"] as const;
export const POLOS = ["autor", "reu", "outro"] as const;

export const ROTULOS_GRAU: Record<(typeof GRAUS)[number], string> = {
  primeiro: "1º grau",
  segundo: "2º grau",
  superior: "Tribunal superior",
  administrativo: "Administrativo",
};

export const ROTULOS_SITUACAO: Record<(typeof SITUACOES)[number], string> = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  arquivado: "Arquivado",
  encerrado: "Encerrado",
};

export const ROTULOS_FASE: Record<(typeof FASES)[number], string> = {
  conhecimento: "Conhecimento",
  recursal: "Recursal",
  execucao: "Execução",
  outra: "Outra",
};

export const ROTULOS_POLO: Record<(typeof POLOS)[number], string> = {
  autor: "Autor",
  reu: "Réu",
  outro: "Outro",
};

export type ProcessoValues = {
  numeroCnj: string;
  tribunal: string;
  sistemaProcessual: string;
  grau: string;
  comarca: string;
  vara: string;
  classe: string;
  assunto: string;
  areaJuridica: string;
  parteAutora: string;
  parteRe: string;
  dataDistribuicao: string;
  valorCausa: string;
  situacao: string;
  fase: string;
  observacoes: string;
};

export type ProcessoErrors = Partial<Record<keyof ProcessoValues | "geral", string>>;

export type ProcessoPayload = {
  numero_cnj: string | null;
  tribunal: string | null;
  sistema_processual: string | null;
  grau: (typeof GRAUS)[number] | null;
  comarca: string | null;
  vara: string | null;
  classe: string | null;
  assunto: string | null;
  area_juridica: string | null;
  parte_autora: string | null;
  parte_re: string | null;
  data_distribuicao: string | null;
  valor_causa: string | null;
  situacao: (typeof SITUACOES)[number];
  fase: (typeof FASES)[number] | null;
  observacoes: string | null;
};

export const VALORES_PROCESSO_VAZIOS: ProcessoValues = {
  numeroCnj: "",
  tribunal: "",
  sistemaProcessual: "",
  grau: "",
  comarca: "",
  vara: "",
  classe: "",
  assunto: "",
  areaJuridica: "",
  parteAutora: "",
  parteRe: "",
  dataDistribuicao: "",
  valorCausa: "",
  situacao: "ativo",
  fase: "",
  observacoes: "",
};

export function lerValoresProcesso(formData: FormData): ProcessoValues {
  const campo = (nome: string) => String(formData.get(nome) ?? "").trim();
  return {
    numeroCnj: campo("numeroCnj"),
    tribunal: campo("tribunal"),
    sistemaProcessual: campo("sistemaProcessual"),
    grau: campo("grau"),
    comarca: campo("comarca"),
    vara: campo("vara"),
    classe: campo("classe"),
    assunto: campo("assunto"),
    areaJuridica: campo("areaJuridica"),
    parteAutora: campo("parteAutora"),
    parteRe: campo("parteRe"),
    dataDistribuicao: campo("dataDistribuicao"),
    valorCausa: campo("valorCausa"),
    situacao: campo("situacao"),
    fase: campo("fase"),
    observacoes: campo("observacoes"),
  };
}

function naoVazio(valor: string): string | null {
  return valor || null;
}

/**
 * Converte valor monetário digitado em formato brasileiro (1.234,56) ou com ponto decimal (1234.56).
 * Retorna null quando o texto não é um número positivo ou zero.
 */
export function lerValorMonetario(texto: string): string | null {
  const limpo = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return limpo;
}

export function validarProcesso(values: ProcessoValues): {
  errors: ProcessoErrors;
  payload?: ProcessoPayload;
} {
  const errors: ProcessoErrors = {};

  if (values.numeroCnj && !isNumeroCnjValido(values.numeroCnj)) {
    errors.numeroCnj = "Número CNJ inválido. Confira o formato e o dígito verificador.";
  }
  if (values.grau && !(GRAUS as readonly string[]).includes(values.grau)) {
    errors.grau = "Grau de jurisdição inválido.";
  }
  if (!(SITUACOES as readonly string[]).includes(values.situacao)) {
    errors.situacao = "Situação inválida.";
  }
  if (values.fase && !(FASES as readonly string[]).includes(values.fase)) {
    errors.fase = "Fase processual inválida.";
  }

  let valorCausa: string | null = null;
  if (values.valorCausa) {
    valorCausa = lerValorMonetario(values.valorCausa);
    if (valorCausa === null) {
      errors.valorCausa = "Informe um valor válido, por exemplo 1.500,00.";
    }
  }

  if (values.dataDistribuicao && !/^\d{4}-\d{2}-\d{2}$/.test(values.dataDistribuicao)) {
    errors.dataDistribuicao = "Data de distribuição inválida.";
  }

  for (const [campo, rotulo] of [
    ["tribunal", "Tribunal"],
    ["assunto", "Assunto"],
    ["parteAutora", "Parte autora"],
    ["parteRe", "Parte ré"],
  ] as const) {
    if (values[campo].length > 300) {
      errors[campo] = `${rotulo} deve ter no máximo 300 caracteres.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    payload: {
      numero_cnj: naoVazio(values.numeroCnj),
      tribunal: naoVazio(values.tribunal),
      sistema_processual: naoVazio(values.sistemaProcessual),
      grau: (values.grau || null) as ProcessoPayload["grau"],
      comarca: naoVazio(values.comarca),
      vara: naoVazio(values.vara),
      classe: naoVazio(values.classe),
      assunto: naoVazio(values.assunto),
      area_juridica: naoVazio(values.areaJuridica),
      parte_autora: naoVazio(values.parteAutora),
      parte_re: naoVazio(values.parteRe),
      data_distribuicao: naoVazio(values.dataDistribuicao),
      valor_causa: valorCausa,
      situacao: values.situacao as ProcessoPayload["situacao"],
      fase: (values.fase || null) as ProcessoPayload["fase"],
      observacoes: naoVazio(values.observacoes),
    },
  };
}
