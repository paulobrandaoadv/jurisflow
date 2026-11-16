import { describe, expect, it } from "vitest";
import { preencherModelo } from "@/lib/gerador/modelo";

describe("preenchimento de modelos", () => {
  it("substitui os campos pelos valores informados, inclusive quando repetidos", () => {
    const { texto, faltantes } = preencherModelo("Autor: {{ cliente.nome }}. Ref.: {{cliente.nome}}", {
      "cliente.nome": "Maria Silva",
    });
    expect(texto).toBe("Autor: Maria Silva. Ref.: Maria Silva");
    expect(faltantes).toEqual([]);
  });

  it("mantém o marcador e lista o campo quando o valor é ausente ou vazio", () => {
    const { texto, faltantes } = preencherModelo("CNJ {{processo.numero_cnj}} na {{processo.vara}}", {
      "processo.numero_cnj": "  ",
    });
    expect(texto).toBe("CNJ {{processo.numero_cnj}} na {{processo.vara}}");
    expect(faltantes).toEqual(["processo.numero_cnj", "processo.vara"]);
  });
});
