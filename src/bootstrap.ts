/*
  Bootstrap do processo.
  Em alguns ambientes (ex.: Node 18 + certas versões de undici), o global File pode não existir,
  causando crash com: "ReferenceError: File is not defined".

  A aplicação não depende diretamente de File, então um polyfill mínimo é suficiente.
*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;

if (typeof g.File === 'undefined') {
  // Polyfill mínimo compatível com o que o undici espera (existência do identificador File)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BlobCtor: any = g.Blob;

  // Se Blob não existir (muito improvável em Node 18+), cria um placeholder.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Base: any = BlobCtor || class BlobFallback {};

  g.File = class File extends Base {
    name: string;
    lastModified: number;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(bits: any[] = [], name = 'file', options: any = {}) {
      super(bits, options);
      this.name = String(name);
      this.lastModified = typeof options.lastModified === 'number' ? options.lastModified : Date.now();
    }
  };
}

// Carrega a aplicação principal depois dos polyfills
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('./index');
