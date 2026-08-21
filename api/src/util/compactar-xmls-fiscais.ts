import { PassThrough } from "node:stream";
import { ZipArchive } from "archiver";

export type PastaXmlFiscal = "nfe" | "nfce";

export type SubpastaXmlFiscal = "canceladas";

export type ArquivoXmlCompactacao = {
	pasta: PastaXmlFiscal;
	subpasta?: SubpastaXmlFiscal;
	nomeArquivo: string;
	conteudo: string;
};

export function montarCaminhoZipXml(arquivo: ArquivoXmlCompactacao): string {
	const partes: string[] = [arquivo.pasta];
	if (arquivo.subpasta) partes.push(arquivo.subpasta);
	partes.push(arquivo.nomeArquivo);
	return partes.join("/");
}

export async function compactarXmlsFiscais(
	arquivos: ArquivoXmlCompactacao[],
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const archive = new ZipArchive({ zlib: { level: 9 } });
		const stream = new PassThrough();
		const chunks: Buffer[] = [];

		stream.on("data", (chunk: Buffer) => chunks.push(chunk));
		stream.on("end", () => resolve(Buffer.concat(chunks)));
		stream.on("error", reject);
		archive.on("error", reject);

		archive.pipe(stream);

		for (const arquivo of arquivos) {
			archive.append(arquivo.conteudo, {
				name: montarCaminhoZipXml(arquivo),
			});
		}

		void archive.finalize();
	});
}
