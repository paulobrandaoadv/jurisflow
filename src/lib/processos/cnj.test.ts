import { describe, expect, it } from "vitest";
import { calcularDvCnj, isNumeroCnjValido } from "@/lib/processos/cnj";

describe("número CNJ", () => {
  it("aceita números com dígito verificador correto (exemplos publicados)", () => {
    expect(isNumeroCnjValido("0000001-39.2024.8.26.0100")).toBe(true);
    expect(isNumeroCnjValido("1234567-96.2023.3.00.0000")).toBe(true);
  });

  it("rejeita dígito verificador incorreto para a mesma sequência", () => {
    expect(calcularDvCnj("0000001", "2024", "8", "26", "0110")).toBe("09");
    expect(isNumeroCnjValido("0000001-39.2024.8.26.0110")).toBe(false);
  });

  it("rejeita formato inválido", () => {
    expect(isNumeroCnjValido("")).toBe(false);
    expect(isNumeroCnjValido("0000001-39.2024.8.26.010")).toBe(false);
    expect(isNumeroCnjValido("00000013920248260100")).toBe(false);
  });
});
