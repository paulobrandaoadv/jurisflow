import { ehDataIsoValida, uuidOuNull } from "@/lib/prazos/validation";

export const TIPOS_EVENTO = [
  "audiencia",
  "pericia",
  "reuniao",
  "atendimento",
  "compromisso",
  "diligencia",
  "tarefa",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const ROTULOS_TIPO_EVENTO: Record<TipoEvento, string> = {
  audiencia: "Audiência",
  pericia: "Perícia",
  reuniao: "Reunião",
  atendimento: "Atendimento",
  compromisso: "Compromisso",
  diligencia: "Diligência",
  tarefa: "Tarefa",
};

export type EventoValues = {
  titulo: string;
  tipo: string;
  data: string;
  horario: string;
  local: string;
  processoId: string;
  clienteId: string;
  responsavelId: string;
  descricao: string;
};

export type EventoErrors = Partial<Record<keyof EventoValues | "geral", string>>;

export const EVENTO_VAZIO: EventoValues = {
  titulo: "",
  tipo: "compromisso",
  data: "",
  horario: "",
  local: "",
  processoId: "",
  clienteId: "",
  responsavelId: "",
  descricao: "",
};

export function lerValoresEvento(formData: FormData): EventoValues {
  const texto = (campo: keyof EventoValues) => String(formData.get(campo) ?? "").trim();
  return {
    titulo: texto("titulo"),
    tipo: texto("tipo"),
    data: texto("data"),
    horario: texto("horario"),
    local: texto("local"),
    processoId: texto("processoId"),
    clienteId: texto("clienteId"),
    responsavelId: texto("responsavelId"),
    descricao: texto("descricao"),
  };
}

export function validarEvento(values: EventoValues) {
  const errors: EventoErrors = {};
  if (!values.titulo) errors.titulo = "Informe o título.";
  else if (values.titulo.length > 200) errors.titulo = "Use no máximo 200 caracteres.";
  if (!(TIPOS_EVENTO as readonly string[]).includes(values.tipo)) errors.tipo = "Escolha o tipo.";
  if (!ehDataIsoValida(values.data)) errors.data = "Informe a data.";
  if (values.horario && !/^\d{2}:\d{2}$/.test(values.horario)) errors.horario = "Horário inválido.";

  if (Object.keys(errors).length > 0) return { errors, payload: undefined };

  return {
    errors,
    payload: {
      titulo: values.titulo,
      tipo: values.tipo,
      data: values.data,
      horario: values.horario || null,
      local: values.local || null,
      process_id: uuidOuNull(values.processoId),
      client_id: uuidOuNull(values.clienteId),
      responsavel_id: uuidOuNull(values.responsavelId),
      descricao: values.descricao || null,
    },
  };
}
