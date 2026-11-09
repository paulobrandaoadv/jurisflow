export const CATEGORIAS = [
  "rg",
  "cpf",
  "cnh",
  "comprovante_residencia",
  "certidao_nascimento",
  "certidao_casamento",
  "comprovante_renda",
  "outro_pessoal",
  "procuracao",
  "contrato_honorarios",
  "declaracao_hipossuficiencia",
  "declaracao_residencia",
  "peticao_inicial",
  "contestacao",
  "replica",
  "recurso",
  "decisao",
  "sentenca",
  "acordao",
  "certidao",
  "outro_juridico",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const ROTULOS_CATEGORIA: Record<Categoria, string> = {
  rg: "RG",
  cpf: "CPF",
  cnh: "CNH",
  comprovante_residencia: "Comprovante de residência",
  certidao_nascimento: "Certidão de nascimento",
  certidao_casamento: "Certidão de casamento",
  comprovante_renda: "Comprovante de renda",
  outro_pessoal: "Outro documento pessoal",
  procuracao: "Procuração",
  contrato_honorarios: "Contrato de honorários",
  declaracao_hipossuficiencia: "Declaração de hipossuficiência",
  declaracao_residencia: "Declaração de residência",
  peticao_inicial: "Petição inicial",
  contestacao: "Contestação",
  replica: "Réplica",
  recurso: "Recurso",
  decisao: "Decisão",
  sentenca: "Sentença",
  acordao: "Acórdão",
  certidao: "Certidão processual",
  outro_juridico: "Outro documento jurídico",
};

export const TIPOS_PERMITIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const TAMANHO_MAXIMO_ARQUIVO = 20 * 1024 * 1024;
export const TAMANHO_MAXIMO_LOTE = 50 * 1024 * 1024;
export const MAXIMO_TAGS = 10;
export const VALIDADE_LINK_SEGUNDOS = 60;
export const BUCKET_DOCUMENTOS = "documentos";

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ValoresDocumento = {
  nome: string;
  categoria: string;
  descricao: string;
  tags: string;
  dataDocumento: string;
  clienteId: string;
  responsavelId: string;
  processoIds: string[];
};

export type DocumentoErrors = Partial<Record<keyof ValoresDocumento | "arquivos" | "geral", string>>;

export type DocumentoPayload = {
  nome: string;
  categoria: Categoria;
  descricao: string | null;
  tags: string[];
  data_documento: string | null;
  client_id: string | null;
  responsavel_id: string | null;
  processoIds: string[];
};

export function lerValoresDocumento(formData: FormData): ValoresDocumento {
  const texto = (campo: string) => String(formData.get(campo) ?? "").trim();
  return {
    nome: texto("nome"),
    categoria: texto("categoria"),
    descricao: texto("descricao"),
    tags: texto("tags"),
    dataDocumento: texto("dataDocumento"),
    clienteId: texto("clienteId"),
    responsavelId: texto("responsavelId"),
    processoIds: formData.getAll("processoIds").map((v) => String(v)).filter(Boolean),
  };
}

export function lerTags(texto: string): string[] {
  return [...new Set(texto.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function nomeSemExtensao(nomeArquivo: string): string {
  return nomeArquivo.replace(/\.[^.]+$/, "").trim() || nomeArquivo;
}

function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const data = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(texto);
}

export function validarMetadados(
  values: ValoresDocumento,
  opcoes: { nomeObrigatorio: boolean },
): { errors: DocumentoErrors; payload: DocumentoPayload | null } {
  const errors: DocumentoErrors = {};
  const tags = lerTags(values.tags);

  if (opcoes.nomeObrigatorio && !values.nome) {
    errors.nome = "Informe o nome do documento.";
  } else if (values.nome.length > 200) {
    errors.nome = "Use no máximo 200 caracteres.";
  }

  if (!(CATEGORIAS as readonly string[]).includes(values.categoria)) {
    errors.categoria = "Escolha a categoria do documento.";
  }

  if (values.descricao.length > 2000) {
    errors.descricao = "Use no máximo 2000 caracteres.";
  }

  if (tags.length > MAXIMO_TAGS) {
    errors.tags = `Use no máximo ${MAXIMO_TAGS} tags.`;
  } else if (tags.some((t) => t.length > 40)) {
    errors.tags = "Cada tag deve ter no máximo 40 caracteres.";
  }

  if (values.dataDocumento && !dataValida(values.dataDocumento)) {
    errors.dataDocumento = "Data inválida.";
  }

  if (values.clienteId && !UUID_REGEX.test(values.clienteId)) {
    errors.clienteId = "Cliente inválido.";
  }

  if (values.responsavelId && !UUID_REGEX.test(values.responsavelId)) {
    errors.responsavelId = "Responsável inválido.";
  }

  if (values.processoIds.some((id) => !UUID_REGEX.test(id))) {
    errors.processoIds = "Processo inválido.";
  }

  if (Object.keys(errors).length > 0) return { errors, payload: null };

  return {
    errors,
    payload: {
      nome: values.nome,
      categoria: values.categoria as Categoria,
      descricao: values.descricao || null,
      tags,
      data_documento: values.dataDocumento || null,
      client_id: values.clienteId || null,
      responsavel_id: values.responsavelId || null,
      processoIds: [...new Set(values.processoIds)],
    },
  };
}

function comecaCom(bytes: Uint8Array, deslocamento: number, texto: string): boolean {
  return [...texto].every((c, i) => bytes[deslocamento + i] === c.charCodeAt(0));
}

export function assinaturaCorresponde(mime: string, inicio: Uint8Array): boolean {
  switch (mime) {
    case "application/pdf":
      return comecaCom(inicio, 0, "%PDF");
    case "image/jpeg":
      return inicio[0] === 0xff && inicio[1] === 0xd8 && inicio[2] === 0xff;
    case "image/png":
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => inicio[i] === b);
    case "image/webp":
      return comecaCom(inicio, 0, "RIFF") && comecaCom(inicio, 8, "WEBP");
    default:
      return false;
  }
}

export function validarArquivo(
  arquivo: { name: string; size: number; type: string },
  inicio: Uint8Array,
): string | null {
  if (arquivo.size === 0) return `${arquivo.name}: o arquivo está vazio.`;
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    return `${arquivo.name}: o arquivo passa de 20 MB.`;
  }
  if (!(arquivo.type in TIPOS_PERMITIDOS)) {
    return `${arquivo.name}: tipo não permitido. Use PDF, JPG, PNG ou WEBP.`;
  }
  if (!assinaturaCorresponde(arquivo.type, inicio)) {
    return `${arquivo.name}: o conteúdo não corresponde ao tipo do arquivo.`;
  }
  return null;
}
