import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip, gunzipSync } from "node:zlib";

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

function lerNomeTar(header: Buffer): string {
	const fim = header.subarray(0, 100).indexOf(0);
	const bruto = header.subarray(0, fim >= 0 ? fim : 100).toString("utf8");
	return bruto.replace(/\\/g, "/").replace(/^\/+/, "");
}

function lerTamanhoTar(header: Buffer): number {
	const bruto = header
		.subarray(124, 136)
		.toString("latin1")
		.replace(/\0/g, "")
		.trim();
	if (!bruto) return 0;
	const n = Number.parseInt(bruto, 8);
	if (!Number.isFinite(n) || n < 0) {
		throw new Error("Cabeçalho tar inválido (tamanho)");
	}
	return n;
}

function caminhoSeguroNoDestino(destino: string, nome: string): string {
	const partes = nome.split("/").filter((p) => p && p !== ".");
	if (partes.some((p) => p === "..")) {
		throw new Error(`Entrada inválida no backup: ${nome}`);
	}
	return join(destino, ...partes);
}

/** Extrai `.tar.gz` gerado por `compactarPastaTarGz` para a pasta destino. */
export async function extrairPastaTarGz(
	arquivo: string,
	destino: string,
): Promise<void> {
	await mkdir(destino, { recursive: true });
	const compactado = await readFile(arquivo);
	let tar: Buffer;
	try {
		tar = gunzipSync(compactado);
	} catch {
		throw new Error("Arquivo de backup inválido ou corrompido (gzip)");
	}

	let offset = 0;
	while (offset + 512 <= tar.length) {
		const header = tar.subarray(offset, offset + 512);
		offset += 512;
		if (header.every((b) => b === 0)) {
			break;
		}

		const nome = lerNomeTar(header);
		const tamanho = lerTamanhoTar(header);
		const tipo = String.fromCharCode(header[156] ?? 0);
		const dados = tar.subarray(offset, offset + tamanho);
		const pad = tamanho % 512 === 0 ? 0 : 512 - (tamanho % 512);
		offset += tamanho + pad;

		if (!nome) {
			continue;
		}

		const ehDir = tipo === "5" || nome.endsWith("/");
		const caminho = caminhoSeguroNoDestino(
			destino,
			ehDir ? nome.replace(/\/+$/, "") : nome,
		);
		if (ehDir) {
			await mkdir(caminho, { recursive: true });
			continue;
		}
		if (tipo !== "0" && tipo !== "\0") {
			continue;
		}
		await mkdir(dirname(caminho), { recursive: true });
		await writeFile(caminho, dados);
	}
}
