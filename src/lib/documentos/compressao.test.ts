import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepararArquivo } from "./compressao";

async function imagemGrande(formato: "jpeg" | "png"): Promise<Uint8Array<ArrayBuffer>> {
  const pixels = Buffer.alloc(3000 * 2000 * 3);
  for (let y = 0; y < 2000; y += 1) {
    for (let x = 0; x < 3000; x += 1) {
      const indice = (y * 3000 + x) * 3;
      pixels[indice] = x % 256;
      pixels[indice + 1] = y % 256;
      pixels[indice + 2] = 128;
    }
  }
  const raw = sharp(pixels, { raw: { width: 3000, height: 2000, channels: 3 } });
  return new Uint8Array(await (formato === "jpeg" ? raw.jpeg({ quality: 100 }) : raw.png()).toBuffer());
}

describe("prepararArquivo", () => {
  it("reduz a largura de uma foto grande e diminui o tamanho", async () => {
    const original = await imagemGrande("jpeg");
    const resultado = await prepararArquivo(original, "image/jpeg");

    const metadados = await sharp(resultado.bytes).metadata();
    expect(resultado.mime).toBe("image/jpeg");
    expect(metadados.width).toBeLessThanOrEqual(2000);
    expect(resultado.bytes.length).toBeLessThan(original.length);
  });

  it("converte PNG grande para WEBP menor", async () => {
    const original = await imagemGrande("png");
    const resultado = await prepararArquivo(original, "image/png");

    expect(resultado.mime).toBe("image/webp");
    expect(resultado.bytes.length).toBeLessThan(original.length);
  });

  it("mantém o arquivo original quando a compressão não reduz o tamanho", async () => {
    const pequena = new Uint8Array(
      await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } })
        .jpeg({ quality: 10 })
        .toBuffer(),
    );
    const resultado = await prepararArquivo(pequena, "image/jpeg");

    expect(resultado.bytes).toBe(pequena);
    expect(resultado.mime).toBe("image/jpeg");
  });

  it("não altera PDFs pequenos", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.4 conteudo");
    const resultado = await prepararArquivo(pdf, "application/pdf");

    expect(resultado.bytes).toBe(pdf);
    expect(resultado.mime).toBe("application/pdf");
  });

  it("comprime PDF grande com imagem sem compressão", async () => {
    const original = pdfComImagemGrande();
    const resultado = await prepararArquivo(original, "application/pdf");

    expect(resultado.mime).toBe("application/pdf");
    expect(resultado.bytes.length).toBeLessThan(original.length);
    expect(new TextDecoder().decode(resultado.bytes.subarray(0, 4))).toBe("%PDF");
  }, 60000);

  it("mantém PDF grande original quando não é um PDF válido", async () => {
    const invalido = new Uint8Array(3 * 1024 * 1024);
    invalido.set(new TextEncoder().encode("%PDF-1.4 quebrado"));
    const resultado = await prepararArquivo(invalido, "application/pdf");

    expect(resultado.bytes).toBe(invalido);
    expect(resultado.mime).toBe("application/pdf");
  }, 60000);
});

function pdfComImagemGrande(): Uint8Array<ArrayBuffer> {
  const largura = 1200;
  const altura = 1200;
  const pixels = Buffer.alloc(largura * altura * 3);
  let semente = 12345;
  for (let i = 0; i < pixels.length; i += 1) {
    semente = (semente * 1103515245 + 12345) & 0x7fffffff;
    pixels[i] = semente >> 16;
  }

  const objetos = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj\n",
  ];
  const conteudo = "q 595 0 0 842 0 0 cm /Im0 Do Q";
  const cabecalhoImagem = `4 0 obj << /Type /XObject /Subtype /Image /Width ${largura} /Height ${altura} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${pixels.length} >> stream\n`;
  const pdf = Buffer.concat([
    Buffer.from("%PDF-1.4\n"),
    Buffer.from(objetos.join("")),
    Buffer.from(cabecalhoImagem),
    pixels,
    Buffer.from(`\nendstream endobj\n5 0 obj << /Length ${conteudo.length} >> stream\n${conteudo}\nendstream endobj\ntrailer << /Root 1 0 R /Size 6 >>\n%%EOF\n`),
  ]);
  return new Uint8Array(pdf);
}

