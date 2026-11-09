import { describe, expect, it } from "vitest";
import { can, PERMISSION_MATRIX, PERMISSIONS, ROLES } from "@/lib/auth/permissions";

describe("matriz de permissões", () => {
  it("somente administrador gerencia usuários e lê auditoria", () => {
    for (const role of ROLES) {
      const esperado = role === "admin";
      expect(can(role, "usuarios:gerenciar")).toBe(esperado);
      expect(can(role, "auditoria:ler")).toBe(esperado);
    }
  });

  it("consulta lê mas não escreve clientes nem processos", () => {
    expect(can("consulta", "clientes:ler")).toBe(true);
    expect(can("consulta", "clientes:escrever")).toBe(false);
    expect(can("consulta", "processos:ler")).toBe(true);
    expect(can("consulta", "processos:escrever")).toBe(false);
    expect(can("consulta", "documentos:ler")).toBe(true);
    expect(can("consulta", "documentos:escrever")).toBe(false);
  });

  it("advogado e assistente escrevem clientes, processos e documentos", () => {
    for (const role of ["advogado", "assistente"] as const) {
      expect(can(role, "clientes:escrever")).toBe(true);
      expect(can(role, "processos:escrever")).toBe(true);
      expect(can(role, "documentos:escrever")).toBe(true);
    }
  });

  it("papel desconhecido não recebe permissão alguma", () => {
    expect(can("invasor" as never, "clientes:ler")).toBe(false);
  });

  it("toda permissão declarada está definida para cada papel", () => {
    for (const role of ROLES) {
      expect(PERMISSION_MATRIX[role].every((p) => PERMISSIONS.includes(p))).toBe(true);
    }
  });
});
