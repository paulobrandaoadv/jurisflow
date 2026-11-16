import { describe, expect, it } from "vitest";
import { momentoDoAlerta } from "@/lib/prazos/alertas";

describe("momentoDoAlerta", () => {
  it("retorna o momento exato nos dias de aviso", () => {
    expect(momentoDoAlerta(7)).toBe("7_dias");
    expect(momentoDoAlerta(3)).toBe("3_dias");
    expect(momentoDoAlerta(2)).toBe("2_dias");
    expect(momentoDoAlerta(1)).toBe("1_dia");
    expect(momentoDoAlerta(0)).toBe("dia");
  });

  it("não alerta fora da janela de 7 dias", () => {
    expect(momentoDoAlerta(8)).toBeNull();
    expect(momentoDoAlerta(4)).toBeNull();
  });

  it("marca como vencido qualquer dia após o vencimento", () => {
    expect(momentoDoAlerta(-1)).toBe("vencido");
    expect(momentoDoAlerta(-5)).toBe("vencido");
  });
});
