import { describe, expect, it } from "vitest";
import { aliasDatajud, somenteDigitos } from "@/lib/publicacoes/numero-cnj";

describe("somenteDigitos", () => {
  it("remove a máscara do número CNJ", () => {
    expect(somenteDigitos("0000832-35.2018.4.01.3202")).toBe("00008323520184013202");
  });
});

describe("aliasDatajud", () => {
  it("usa o endpoint federal para J=4", () => {
    expect(aliasDatajud("0000832-35.2018.4.01.3202")).toBe("trf1");
  });

  it("usa o endpoint estadual pela sigla do TJ para J=8", () => {
    expect(aliasDatajud("1234567-89.2020.8.24.0001")).toBe("tjsc");
  });

  it("retorna null para ramos não suportados ou número inválido", () => {
    expect(aliasDatajud("1234567-89.2020.6.24.0001")).toBeNull();
    expect(aliasDatajud("123")).toBeNull();
  });
});
