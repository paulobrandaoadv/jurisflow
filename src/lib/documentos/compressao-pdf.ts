import { join } from "node:path";
import { Worker } from "node:worker_threads";

const LIMITE_PARA_COMPRIMIR = 2 * 1024 * 1024;
const TEMPO_LIMITE_MS = 40_000;

const ARGUMENTOS_GS = [
  "-sDEVICE=pdfwrite",
  "-dCompatibilityLevel=1.5",
  "-dPDFSETTINGS=/ebook",
  "-dNOPAUSE",
  "-dQUIET",
  "-dBATCH",
  "-dSAFER",
  "-sOutputFile=/saida.pdf",
  "/entrada.pdf",
];

// Caminho calculado em tempo de execução: resolver o pacote no bundle faria o Turbopack trocar o caminho por um ID.
function caminhosGs(): { caminhoGs: string; caminhoWasm: string } {
  const pasta = join(process.cwd(), "node_modules", "@jspawn", "ghostscript-wasm");
  return { caminhoGs: join(pasta, "gs.js"), caminhoWasm: join(pasta, "gs.wasm") };
}

// O Ghostscript WASM é síncrono: só pode ser interrompido encerrando a thread, por isso roda em worker.
const CODIGO_WORKER = `
const { workerData, parentPort } = require("node:worker_threads");
const { readFileSync } = require("node:fs");
const fabrica = require(workerData.caminhoGs);
const criar = fabrica.default || fabrica;
const wasm = readFileSync(workerData.caminhoWasm);
criar({
  instantiateWasm(imports, sucesso) {
    WebAssembly.instantiate(wasm, imports).then(({ instance, module }) => sucesso(instance, module));
    return {};
  },
  print() {},
  printErr() {},
}).then((gs) => {
  gs.FS.writeFile("/entrada.pdf", new Uint8Array(workerData.bytes));
  const codigo = gs.callMain(workerData.argumentos);
  if (codigo !== 0) return parentPort.postMessage(null);
  parentPort.postMessage(new Uint8Array(gs.FS.readFile("/saida.pdf")));
}).catch(() => parentPort.postMessage(null));
`;

function pareceUmPdfCompleto(bytes: Uint8Array): boolean {
  const cabecalho = new TextDecoder().decode(bytes.subarray(0, 8));
  const fim = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 1024)));
  return cabecalho.startsWith("%PDF-") && fim.includes("%%EOF");
}

function saidaValida(saida: Uint8Array | null, original: Uint8Array): saida is Uint8Array {
  if (!saida || saida.length === 0 || saida.length >= original.length) return false;
  return new TextDecoder().decode(saida.subarray(0, 5)) === "%PDF-";
}

// Devolve null quando não há ganho, o arquivo não é um PDF completo, o Ghostscript falha ou estoura o tempo.
export function comprimirPdf(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (bytes.length < LIMITE_PARA_COMPRIMIR || !pareceUmPdfCompleto(bytes)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const { caminhoGs, caminhoWasm } = caminhosGs();
    const worker = new Worker(CODIGO_WORKER, {
      eval: true,
      workerData: {
        bytes,
        caminhoGs,
        caminhoWasm,
        argumentos: ARGUMENTOS_GS,
      },
    });

    const finalizar = (saida: Uint8Array | null) => {
      clearTimeout(relogio);
      void worker.terminate();
      resolve(saidaValida(saida, bytes) ? new Uint8Array(saida) : null);
    };

    const relogio = setTimeout(() => finalizar(null), TEMPO_LIMITE_MS);
    worker.once("message", (saida: Uint8Array | null) => finalizar(saida));
    worker.once("error", () => finalizar(null));
    worker.once("exit", () => finalizar(null));
  });
}
