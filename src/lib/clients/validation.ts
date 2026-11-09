import { isCnpjValido, isCpfValido, somenteDigitos } from "@/lib/clients/documento";

export const TIPOS_CLIENTE = ["pf", "pj"] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];

export type ClienteValues = {
  tipo: string;
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  observacoes: string;
};

export type ClienteErrors = Partial<Record<keyof ClienteValues | "geral", string>>;

export type ClientePayload = {
  tipo: TipoCliente;
  nome: string;
  cpf_cnpj: string;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
};

export const VALORES_CLIENTE_VAZIOS: ClienteValues = {
  tipo: "pf",
  nome: "",
  cpfCnpj: "",
  email: "",
  telefone: "",
  observacoes: "",
};

export function lerValoresCliente(formData: FormData): ClienteValues {
  const campo = (nome: string) => String(formData.get(nome) ?? "").trim();
  return {
    tipo: campo("tipo"),
    nome: campo("nome"),
    cpfCnpj: campo("cpfCnpj"),
    email: campo("email"),
    telefone: campo("telefone"),
    observacoes: campo("observacoes"),
  };
}

function isTipo(valor: string): valor is TipoCliente {
  return (TIPOS_CLIENTE as readonly string[]).includes(valor);
}

export function validarCliente(values: ClienteValues): {
  errors: ClienteErrors;
  payload?: ClientePayload;
} {
  const errors: ClienteErrors = {};

  if (!isTipo(values.tipo)) {
    errors.tipo = "Selecione pessoa física ou jurídica.";
  }
  if (!values.nome) {
    errors.nome = "Informe o nome.";
  } else if (values.nome.length > 200) {
    errors.nome = "O nome deve ter no máximo 200 caracteres.";
  }

  const documento = somenteDigitos(values.cpfCnpj);
  if (isTipo(values.tipo)) {
    if (values.tipo === "pf" && !isCpfValido(documento)) {
      errors.cpfCnpj = "CPF inválido.";
    } else if (values.tipo === "pj" && !isCnpjValido(documento)) {
      errors.cpfCnpj = "CNPJ inválido.";
    }
  }

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "E-mail inválido.";
  }

  if (Object.keys(errors).length > 0 || !isTipo(values.tipo)) {
    return { errors };
  }

  return {
    errors,
    payload: {
      tipo: values.tipo,
      nome: values.nome,
      cpf_cnpj: documento,
      email: values.email || null,
      telefone: values.telefone || null,
      observacoes: values.observacoes || null,
    },
  };
}
