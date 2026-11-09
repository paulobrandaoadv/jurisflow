import { describe, expect, it } from "vitest";
import {
  assinaturaCorresponde,
  lerTags,
  nomeSemExtensao,
  TAMANHO_MAXIMO_ARQUIVO,
  validarArquivo,
  validarMetadados,
  type ValoresDocumento,
} from "@/lib/documentos/validation";

const base: ValoresDocumento = {
  nome: "RG do cliente",
  categoria: "rg",
  descricao: "",
  tags: "",
  dataDocumento: "",
  clienteId: "",
  responsavelId: "",
  processoIds: [],
};

const UUID = "11111111-2222-4333-8444-555555555555";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);

describe("lerTags", () => {
  it("separa, normaliza para minúsculas e remove duplicatas", () => {
    expect(lerTags(" Urgente, original ,urgente,, ")).toEqual(["urgente", "original"]);
  });

  it("retorna lista vazia para texto vazio", () => {
    expect(lerTags("")).toEqual([]);
  });
});

describe("nomeSemExtensao", () => {
  it("remove a última extensão", () => {
    expect(nomeSemExtensao("contrato.final.pdf")).toBe("contrato.final");
  });

  it("mantém o nome quando não há extensão", () => {
    expect(nomeSemExtensao("anexo")).toBe("anexo");
  });
});

describe("validarMetadados", () => {
  it("aceita dados válidos e gera payload", () => {
    const { errors, payload } = validarMetadados(
      { ...base, tags: "a, b", clienteId: UUID, processoIds: [UUID, UUID] },
      { nomeObrigatorio: true },
    );
    expect(errors).toEqual({});
    expect(payload).toMatchObject({
      nome: "RG do cliente",
      categoria: "rg",
      tags: ["a", "b"],
      client_id: UUID,
      processoIds: [UUID],
      descricao: null,
      data_documento: null,
    });
  });

  it("exige nome quando obrigatório", () => {
    const { errors, payload } = validarMetadados({ ...base, nome: "" }, { nomeObrigatorio: true });
    expect(errors.nome).toBeDefined();
    expect(payload).toBeNull();
  });

  it("não exige nome em envio múltiplo", () => {
    const { errors, payload } = validarMetadados({ ...base, nome: "" }, { nomeObrigatorio: false });
    expect(errors.nome).toBeUndefined();
    expect(payload).not.toBeNull();
  });

  it("rejeita categoria fora da lista", () => {
    const { errors } = validarMetadados({ ...base, categoria: "qualquer" }, { nomeObrigatorio: true });
    expect(errors.categoria).toBeDefined();
  });

  it("rejeita mais de 10 tags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`).join(",");
    const { errors } = validarMetadados({ ...base, tags }, { nomeObrigatorio: true });
    expect(errors.tags).toBeDefined();
  });

  it("rejeita data impossível", () => {
    const { errors } = validarMetadados({ ...base, dataDocumento: "2024-02-31" }, { nomeObrigatorio: true });
    expect(errors.dataDocumento).toBeDefined();
  });

  it("rejeita IDs que não são UUID", () => {
    const { errors } = validarMetadados(
      { ...base, clienteId: "abc", processoIds: ["xyz"] },
      { nomeObrigatorio: true },
    );
    expect(errors.clienteId).toBeDefined();
    expect(errors.processoIds).toBeDefined();
  });
});

describe("assinaturaCorresponde", () => {
  it("reconhece cada tipo permitido pelos bytes iniciais", () => {
    expect(assinaturaCorresponde("application/pdf", PDF)).toBe(true);
    expect(assinaturaCorresponde("image/png", PNG)).toBe(true);
    expect(assinaturaCorresponde("image/jpeg", JPEG)).toBe(true);
    expect(assinaturaCorresponde("image/webp", WEBP)).toBe(true);
  });

  it("rejeita conteúdo que não corresponde ao tipo declarado", () => {
    expect(assinaturaCorresponde("application/pdf", PNG)).toBe(false);
    expect(assinaturaCorresponde("image/png", JPEG)).toBe(false);
  });

  it("rejeita tipos fora da lista", () => {
    expect(assinaturaCorresponde("text/html", PDF)).toBe(false);
  });
});

describe("validarArquivo", () => {
  it("aceita PDF válido", () => {
    expect(validarArquivo({ name: "a.pdf", size: 100, type: "application/pdf" }, PDF)).toBeNull();
  });

  it("rejeita arquivo vazio", () => {
    expect(validarArquivo({ name: "a.pdf", size: 0, type: "application/pdf" }, PDF)).not.toBeNull();
  });

  it("rejeita arquivo acima de 20 MB", () => {
    const erro = validarArquivo(
      { name: "a.pdf", size: TAMANHO_MAXIMO_ARQUIVO + 1, type: "application/pdf" },
      PDF,
    );
    expect(erro).toContain("20 MB");
  });

  it("rejeita tipo não permitido", () => {
    expect(validarArquivo({ name: "a.html", size: 10, type: "text/html" }, PDF)).not.toBeNull();
  });

  it("rejeita arquivo renomeado com assinatura incompatível", () => {
    expect(validarArquivo({ name: "a.pdf", size: 10, type: "application/pdf" }, PNG)).not.toBeNull();
  });
});
