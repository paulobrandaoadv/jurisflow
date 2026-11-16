import { calcularPrazo, TIPOS_CONTAGEM, type TipoContagem } from "@/lib/prazos/calculo";

export const SITUACOES_PRAZO = ["pendente", "confirmado", "cumprido", "cancelado"] as const;
export type SituacaoPrazo = (typeof SITUACOES_PRAZO)[number];

export const ROTULOS_SITUACAO_PRAZO: Record<SituacaoPrazo, string> = {
  pendente: "Aguardando confirmação",
  confirmado: "Confirmado",
  cumprido: "Cumprido",
  cancelado: "Cancelado",
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidOuNull(valor: FormDataEntryValue | string | null | undefined): string | null {
  const texto = String(valor ?? "");
  return UUID.test(texto) ? texto : null;
}

export function ehDataIsoValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
}

export type PrazoValues = {
  descricao: string;
  providencia: string;
  dataIdentificacao: string;
  disponibilizacao: string;
  publicacao: string;
  ciencia: string;
  marcoInicial: string;
  dias: string;
  tipoContagem: string;
  vencimentoManual: string;
  fonte: string;
  clienteId: string;
  processoId: string;
  responsavelId: string;
  observacoes: string;
};

export type PrazoErrors = Partial<Record<keyof PrazoValues | "geral", string>>;

export const PRAZO_VAZIO: PrazoValues = {
  descricao: "",
  providencia: "",
  dataIdentificacao: "",
  disponibilizacao: "",
  publicacao: "",
  ciencia: "",
  marcoInicial: "",
  dias: "",
  tipoContagem: "uteis",
  vencimentoManual: "",
  fonte: "",
  clienteId: "",
  processoId: "",
  responsavelId: "",
  observacoes: "",
};

export function lerValoresPrazo(formData: FormData): PrazoValues {
  const texto = (campo: keyof PrazoValues) => String(formData.get(campo) ?? "").trim();
  return {
    descricao: texto("descricao"),
    providencia: texto("providencia"),
    dataIdentificacao: texto("dataIdentificacao"),
    disponibilizacao: texto("disponibilizacao"),
    publicacao: texto("publicacao"),
    ciencia: texto("ciencia"),
    marcoInicial: texto("marcoInicial"),
    dias: texto("dias"),
    tipoContagem: texto("tipoContagem") || "uteis",
    vencimentoManual: texto("vencimentoManual"),
    fonte: texto("fonte"),
    clienteId: texto("clienteId"),
    processoId: texto("processoId"),
    responsavelId: texto("responsavelId"),
    observacoes: texto("observacoes"),
  };
}

const CAMPOS_DATA_OPCIONAIS = [
  "dataIdentificacao",
  "disponibilizacao",
  "publicacao",
  "ciencia",
] as const;

export type PayloadPrazo = {
  descricao: string;
  providencia: string | null;
  data_identificacao: string | null;
  disponibilizacao: string | null;
  publicacao: string | null;
  ciencia: string | null;
  marco_inicial: string | null;
  dias: number | null;
  tipo_contagem: TipoContagem;
  regra_aplicada: string;
  vencimento_calculado: string;
  fonte: string | null;
  client_id: string | null;
  process_id: string | null;
  responsavel_id: string | null;
  observacoes: string | null;
};

// Valida o cadastro de um prazo e monta o payload. A data-limite fica pendente de confirmação do advogado.
export function validarPrazo(values: PrazoValues): { errors: PrazoErrors; payload?: PayloadPrazo } {
  const errors: PrazoErrors = {};

  if (!values.descricao) errors.descricao = "Informe a descrição do prazo.";
  else if (values.descricao.length > 300) errors.descricao = "Use no máximo 300 caracteres.";

  for (const campo of CAMPOS_DATA_OPCIONAIS) {
    if (values[campo] && !ehDataIsoValida(values[campo])) errors[campo] = "Data inválida.";
  }

  if (!(TIPOS_CONTAGEM as readonly string[]).includes(values.tipoContagem)) {
    errors.tipoContagem = "Escolha o tipo de contagem.";
  }

  let vencimento: string | undefined;
  let regra = "";
  let marco: string | null = null;
  let dias: number | null = null;
  const tipo = values.tipoContagem as TipoContagem;

  if (tipo === "manual") {
    if (!ehDataIsoValida(values.vencimentoManual)) {
      errors.vencimentoManual = "Informe a data-limite.";
    } else {
      vencimento = values.vencimentoManual;
      regra = "Data informada manualmente.";
    }
  } else if (tipo === "uteis" || tipo === "corridos") {
    if (!ehDataIsoValida(values.marcoInicial)) {
      errors.marcoInicial = "Informe o marco inicial (data da publicação ou da ciência).";
    }
    const quantidade = Number(values.dias);
    if (!/^\d+$/.test(values.dias) || quantidade < 1 || quantidade > 3650) {
      errors.dias = "Informe um número de dias entre 1 e 3650.";
    }
    if (!errors.marcoInicial && !errors.dias) {
      const resultado = calcularPrazo(values.marcoInicial, quantidade, tipo);
      vencimento = resultado.vencimento;
      regra = resultado.regra;
      marco = values.marcoInicial;
      dias = quantidade;
    }
  }

  if (Object.keys(errors).length > 0 || !vencimento) {
    return { errors };
  }

  return {
    errors,
    payload: {
      descricao: values.descricao,
      providencia: values.providencia || null,
      data_identificacao: values.dataIdentificacao || null,
      disponibilizacao: values.disponibilizacao || null,
      publicacao: values.publicacao || null,
      ciencia: values.ciencia || null,
      marco_inicial: marco,
      dias,
      tipo_contagem: tipo,
      regra_aplicada: regra,
      vencimento_calculado: vencimento,
      fonte: values.fonte || null,
      client_id: uuidOuNull(values.clienteId),
      process_id: uuidOuNull(values.processoId),
      responsavel_id: uuidOuNull(values.responsavelId),
      observacoes: values.observacoes || null,
    },
  };
}

// Data-limite efetiva: a confirmada pelo advogado (se houver) ou a calculada pelo sistema.
export function vencimentoEfetivo(prazo: {
  vencimento_confirmado: string | null;
  vencimento_calculado: string;
}): string {
  return prazo.vencimento_confirmado ?? prazo.vencimento_calculado;
}

export function diasAte(iso: string, hoje: string): number {
  const alvo = Date.parse(`${iso}T00:00:00Z`);
  const agora = Date.parse(`${hoje}T00:00:00Z`);
  return Math.round((alvo - agora) / 86_400_000);
}

export function hojeSaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
