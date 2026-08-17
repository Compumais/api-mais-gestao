import { execFile } from "node:child_process";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import type { Readable, Writable } from "node:stream";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type PortaSerialAberta = {
	path: string;
	ler: () => Promise<Buffer>;
	escrever: (dados: Buffer) => Promise<void>;
	fechar: () => Promise<void>;
};

function caminhoWindows(porta: string): string {
	const nome = porta.trim().toUpperCase();
	if (nome.startsWith("\\\\.\\")) return nome;
	return `\\\\.\\${nome}`;
}

export async function listarPortasSeriais(): Promise<string[]> {
	if (process.platform === "win32") {
		const encontradas = new Set<string>();
		try {
			const { stdout } = await execFileAsync("powershell.exe", [
				"-NoProfile",
				"-Command",
				"[System.IO.Ports.SerialPort]::GetPortNames() | ForEach-Object { $_ }",
			]);
			for (const linha of stdout.split(/\r?\n/)) {
				const nome = linha.trim().toUpperCase();
				if (/^COM\d+$/.test(nome)) encontradas.add(nome);
			}
		} catch {
			// fallback abaixo
		}
		if (!encontradas.size) {
			for (let i = 1; i <= 20; i++) {
				encontradas.add(`COM${i}`);
			}
		}
		return [...encontradas].sort(
			(a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
		);
	}

	const nomes: string[] = [];
	try {
		const itens = await readdir("/dev");
		for (const nome of itens) {
			if (!/^(ttyUSB|ttyACM|ttyS)\d+$/.test(nome)) continue;
			nomes.push(`/dev/${nome}`);
		}
	} catch {
		return [];
	}
	return nomes.sort();
}

async function configurarBaud(path: string, baud: number): Promise<void> {
	if (process.platform === "win32") {
		const porta = path.replace(/^\\\\.\\/, "");
		await execFileAsync("mode.com", [
			`${porta}:`,
			`BAUD=${baud}`,
			"PARITY=N",
			"DATA=8",
			"STOP=1",
		]).catch(() => undefined);
		return;
	}
	await execFileAsync("stty", [
		"-F",
		path,
		String(baud),
		"cs8",
		"-cstopb",
		"-parenb",
		"raw",
		"-echo",
		"min",
		"0",
		"time",
		"1",
	]).catch(() => undefined);
}

export async function abrirPortaSerial(
	porta: string,
	baud = 9600,
): Promise<PortaSerialAberta> {
	const path =
		process.platform === "win32" ? caminhoWindows(porta) : porta.trim();
	if (!path) {
		throw new Error("Informe a porta da balança.");
	}
	if (process.platform !== "win32" && !existsSync(path)) {
		throw new Error(`Porta ${path} não encontrada.`);
	}

	await configurarBaud(path, baud);

	let leitura: Readable;
	let escrita: Writable;
	try {
		leitura = createReadStream(path, {
			flags: "r+",
			highWaterMark: 256,
		});
		escrita = createWriteStream(path, { flags: "r+" });
	} catch {
		throw new Error(
			`Não foi possível abrir ${porta}. Verifique se a balança está ligada e a porta não está em uso.`,
		);
	}

	let buffer = Buffer.alloc(0);
	leitura.on("data", (chunk: string | Buffer) => {
		const parte = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
		buffer = Buffer.concat([buffer, parte]);
		if (buffer.length > 4096) {
			buffer = buffer.subarray(buffer.length - 2048);
		}
	});

	const erroAbertura = await new Promise<Error | null>((resolve) => {
		const timer = setTimeout(() => resolve(null), 200);
		leitura.once("error", (err) => {
			clearTimeout(timer);
			resolve(err);
		});
		escrita.once("error", (err) => {
			clearTimeout(timer);
			resolve(err);
		});
	});
	if (erroAbertura) {
		leitura.destroy();
		escrita.destroy();
		throw new Error(`Falha na porta ${porta}: ${erroAbertura.message}`);
	}

	return {
		path,
		async ler() {
			const atual = buffer;
			buffer = Buffer.alloc(0);
			return atual;
		},
		async escrever(dados) {
			await new Promise<void>((resolve, reject) => {
				escrita.write(dados, (err) => (err ? reject(err) : resolve()));
			});
		},
		async fechar() {
			leitura.destroy();
			escrita.end();
		},
	};
}
