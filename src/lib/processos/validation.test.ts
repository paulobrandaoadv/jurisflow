import { describe, expect, it } from "vitest";
import {
  lerValorMonetario,
  validarProcesso,
  VALORES_PROCESSO_VAZIOS,
  type ProcessoValues,
} from "@/lib/processos/validation";

const base: ProcessoValues = { ...VALORES_PROCESSO_VAZIOS };

describe("lerValorMonetario", () => {
  it("aceita formato brasileiro e decimal com ponto", () => {
    expect(lerValorMonetario("1.234,56")).toBe("1234.56");
    expect(lerValorMonetario("1234.5")).toBe("1234.5");
    expect(lerValorMonetario("0")).toBe("0");
  });

  it("rejeita texto, negativos e mais de duas casas", () => {
    expect(lerValorMonetario("abc")).toBeNull();
    expect(lerValorMonetario("-10,00")).toBeNull();
    expect(lerValorMonetario("1,234")).toBeNull();
  });
});

describe("validarProcesso", () => {
  it("aceita processo administrativo sem número CNJ", () => {
    const { errors, payload } = validarProcesso(base);
    expect(errors).toEqual({});
    expect(payload?.numero_cnj).toBeNull();
    expect(payload?.situacao).toBe("ativo");
    expect(payload?.valor_causa).toBeNull();
  });

  it("aceita CNJ com dígito verificador correto e converte valor", () => {
    const { errors, payload } = validarProcesso({
      ...base,
      numeroCnj: "0000001-39.2024.8.26.0100",
      valorCausa: "1.500,00",
      grau: "primeiro",
    });
    expect(errors).toEqual({});
    expect(payload?.numero_cnj).toBe("0000001-39.2024.8.26.0100");
    expect(payload?.valor_causa).toBe("1500.00");
    expect(payload?.grau).toBe("primeiro");
  });

  it("rejeita CNJ com dígito verificador errado", () => {
    const { errors, payload } = validarProcesso({ ...base, numeroCnj: "0000001-39.2024.8.26.0110" });
    expect(errors.numeroCnj).toBeDefined();
    expect(payload).toBeUndefined();
  });

  it("rejeita valores fora das listas fechadas e data mal formada", () => {
    const { errors } = validarProcesso({
      ...base,
      grau: "outro",
      situacao: "inventada",
      fase: "xyz",
      dataDistribuicao: "01/02/2024",
    });
    expect(errors.grau).toBeDefined();
    expect(errors.situacao).toBeDefined();
    expect(errors.fase).toBeDefined();
    expect(errors.dataDistribuicao).toBeDefined();
  });
});
