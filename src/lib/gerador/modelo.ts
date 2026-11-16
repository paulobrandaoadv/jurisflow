export const CAMPOS_MODELO = [
  { chave: "cliente.nome", descricao: "Nome do cliente" },
  { chave: "cliente.documento", descricao: "CPF ou CNPJ do cliente" },
  { chave: "processo.numero_cnj", descricao: "Número CNJ do processo" },
  { chave: "processo.tribunal", descricao: "Tribunal" },
  { chave: "processo.comarca", descricao: "Comarca" },
  { chave: "processo.vara", descricao: "Vara" },
  { chave: "processo.classe", descricao: "Classe processual" },
  { chave: "processo.assunto", descricao: "Assunto" },
  { chave: "processo.parte_autora", descricao: "Parte autora" },
  { chave: "processo.parte_re", descricao: "Parte ré" },
  { chave: "processo.valor_causa", descricao: "Valor da causa" },
  { chave: "data.hoje", descricao: "Data de hoje (dd/mm/aaaa)" },
] as const;

export type DadosModelo = Partial<Record<(typeof CAMPOS_MODELO)[number]["chave"], string | null | undefined>>;

const MARCADOR = /\{\{\s*([a-z_]+\.[a-z_]+)\s*\}\}/g;

export type ResultadoModelo = {
  texto: string;
  faltantes: string[];
};

// Campos sem valor ficam no texto como {{campo}} e são devolvidos em `faltantes`,
// para que nada seja gerado com lacuna escondida.
export function preencherModelo(modelo: string, dados: DadosModelo): ResultadoModelo {
  const faltantes = new Set<string>();

  const texto = modelo.replace(MARCADOR, (marcador, chave: string) => {
    const valor = dados[chave as keyof DadosModelo]?.trim();
    if (!valor) {
      faltantes.add(chave);
      return marcador;
    }
    return valor;
  });

  return { texto, faltantes: [...faltantes] };
}
