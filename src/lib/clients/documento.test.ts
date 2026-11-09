import { describe, expect, it } from "vitest";
import {
  formatarDocumento,
  isCnpjValido,
  isCpfValido,
  somenteDigitos,
} from "@/lib/clients/documento";
import { validarCliente, VALORES_CLIENTE_VAZIOS } from "@/lib/clients/validation";

describe("CPF e CNPJ", () => {
  it("aceita CPFs com dígitos verificadores corretos", () => {
    expect(isCpfValido("52998224725")).toBe(true);
  });

  it("rejeita CPFs com dígito errado ou sequência repetida", () => {
    expect(isCpfValido("52998224726")).toBe(false);
    expect(isCpfValido("11111111111")).toBe(false);
  });

  it("aceita CNPJs com dígitos verificadores corretos", () => {
    expect(isCnpjValido("11222333000181")).toBe(true);
  });

  it("rejeita CNPJs com dígito errado", () => {
    expect(isCnpjValido("11222333000182")).toBe(false);
  });

  it("formata documentos válidos", () => {
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
    expect(somenteDigitos("529.982.247-25")).toBe("52998224725");
  });
});

describe("validarCliente", () => {
  const base = {
    ...VALORES_CLIENTE_VAZIOS,
    nome: "Maria Silva",
    cpfCnpj: "529.982.247-25",
  };

  it("normaliza o documento e converte campos opcionais vazios em null", () => {
    const { errors, payload } = validarCliente(base);
    expect(errors).toEqual({});
    expect(payload).toEqual({
      tipo: "pf",
      nome: "Maria Silva",
      cpf_cnpj: "52998224725",
      email: null,
      telefone: null,
      observacoes: null,
    });
  });

  it("exige CNPJ para pessoa jurídica", () => {
    const { errors, payload } = validarCliente({ ...base, tipo: "pj" });
    expect(errors.cpfCnpj).toBe("CNPJ inválido.");
    expect(payload).toBeUndefined();
  });

  it("rejeita nome vazio e e-mail mal formado", () => {
    const { errors } = validarCliente({ ...base, nome: "", email: "abc" });
    expect(errors.nome).toBe("Informe o nome.");
    expect(errors.email).toBe("E-mail inválido.");
  });
});
