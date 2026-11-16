import { describe, expect, it } from "vitest";
import { calcularPrazo, ehRecessoForense } from "./calculo";

describe("calcularPrazo", () => {
  it("conta dias úteis a partir do dia seguinte ao marco, pulando o fim de semana", () => {
    // 02/03/2026 é segunda-feira; 5 dias úteis depois é 09/03/2026.
    const r = calcularPrazo("2026-03-02", 5, "uteis");
    expect(r.dataInicial).toBe("2026-03-03");
    expect(r.vencimento).toBe("2026-03-09");
  });

  it("pula feriado nacional na contagem de dias úteis", () => {
    // 20/04/2026 é segunda; 21/04 (Tiradentes) não conta, então vence em 22/04.
    expect(calcularPrazo("2026-04-20", 1, "uteis").vencimento).toBe("2026-04-22");
    expect(calcularPrazo("2026-04-20", 1, "uteis").feriados).toContain("2026-04-21");
  });

  it("suspende a contagem durante o recesso forense", () => {
    // 18/12/2026 é sexta; o recesso vai de 20/12 a 20/01, então o prazo vence em 21/01/2027.
    const r = calcularPrazo("2026-12-18", 1, "uteis");
    expect(r.vencimento).toBe("2027-01-21");
    expect(r.suspensoes).toContain("2026-12-21");
  });

  it("em dias corridos, prorroga o vencimento que cai no fim de semana", () => {
    // 06/03/2026 é sexta; 2 dias corridos caem no domingo 08/03, então prorroga para 09/03.
    expect(calcularPrazo("2026-03-06", 2, "corridos").vencimento).toBe("2026-03-09");
  });

  it("reconhece o recesso forense nos limites", () => {
    expect(ehRecessoForense("2026-12-19")).toBe(false);
    expect(ehRecessoForense("2026-12-20")).toBe(true);
    expect(ehRecessoForense("2027-01-20")).toBe(true);
    expect(ehRecessoForense("2027-01-21")).toBe(false);
  });

  it("rejeita quantidade de dias inválida", () => {
    expect(() => calcularPrazo("2026-03-02", 0, "uteis")).toThrow(RangeError);
  });
});
