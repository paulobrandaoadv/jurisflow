import sharp from "sharp";
import { comprimirPdf } from "./compressao-pdf";

const LARGURA_MAXIMA = 2000;
const QUALIDADE = 75;

export type ArquivoPreparado = { bytes: Uint8Array<ArrayBuffer>; mime: string };

export async function prepararArquivo(
  bytes: Uint8Array<ArrayBuffer>,
  mime: string,
): Promise<ArquivoPreparado> {
  if (mime === "application/pdf") {
    const comprimido = await comprimirPdf(bytes);
    return { bytes: comprimido ?? bytes, mime };
  }

  const base = sharp(bytes, { failOn: "error" })
    .rotate()
    .resize({ width: LARGURA_MAXIMA, withoutEnlargement: true });

  const saida =
    mime === "image/jpeg"
      ? await base.jpeg({ quality: QUALIDADE, mozjpeg: true }).toBuffer()
      : await base.webp({ quality: QUALIDADE }).toBuffer();

  const mimeSaida = mime === "image/jpeg" ? "image/jpeg" : "image/webp";
  if (saida.length >= bytes.length) return { bytes, mime };

  return { bytes: new Uint8Array(saida), mime: mimeSaida };
}
