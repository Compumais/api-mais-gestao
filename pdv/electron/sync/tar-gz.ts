import { createWriteStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

async function listarArquivos(raiz: string): Promise<string[]> {
	const saida: string[] = [];
	async function andar(atual: string): Promise<void> {
		const entradas = await readdir(atual, { withFileTypes: true });
		for (const entrada of entradas) {
			const caminho = join(atual, entrada.name);
			if (entrada.isDirectory()) {
				await andar(caminho);
			} else if (entrada.isFile()) {
				saida.push(caminho);
			}
		}
	}
	await andar(raiz);
	return saida;
}

function nomeTar(raiz: string, arquivo: string): string {
	return relative(raiz, arquivo).split(sep).join("/");
}

function cabecalhoTar(nome: string, tamanho: number): Buffer {
	const buf = Buffer.alloc(512);
	const nomeBytes = Buffer.from(nome, "utf8");
	if (nomeBytes.length > 100) {
		throw new Error(`Caminho longo demais no backup: ${nome}`);
	}
	nomeBytes.copy(buf, 0);
	buf.write("0000644\0", 100, 8, "latin1");
	buf.write("0000000\0", 108, 8, "latin1");
	buf.write("0000000\0", 116, 8, "latin1");
	buf.write(`${tamanho.toString(8).padStart(11, "0")}\0`, 124, 12, "latin1");
	buf.write(
		`${Math.floor(Date.now() / 1000)
			.toString(8)
			.padStart(11, "0")}\0`,
		136,
		12,
		"latin1",
	);
	buf.write("        ", 148, 8, "latin1");
	buf.write("0", 156, 1, "latin1");
	buf.write("ustar\0", 257, 6, "latin1");
	buf.write("00", 263, 2, "latin1");
	let soma = 0;
	for (let i = 0; i < 512; i++) {
		soma += buf[i] ?? 0;
	}
	buf.write(`${soma.toString(8).padStart(6, "0")}\0 `, 148, 8, "latin1");
	return buf;
}

function paddingTar(tamanho: number): Buffer {
	const resto = tamanho % 512;
	return resto === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - resto);
}

/** Compacta a pasta em `.tar.gz` (sem dependência extra). */
export async function compactarPastaTarGz(
	pasta: string,
	destino: string,
): Promise<void> {
	const arquivos = await listarArquivos(pasta);

	async function* partes(): AsyncGenerator<Buffer> {
		for (const arquivo of arquivos) {
			const dados = await readFile(arquivo);
			const info = await stat(arquivo);
			yield cabecalhoTar(nomeTar(pasta, arquivo), info.size);
			yield dados;
			const pad = paddingTar(info.size);
			if (pad.length) {
				yield pad;
			}
		}
		yield Buffer.alloc(1024);
	}

	await pipeline(
		Readable.from(partes()),
		createGzip({ level: 9 }),
		createWriteStream(destino),
	);
}
