import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { execFile } from "node:child_process";
import {
	closeSync,
	createReadStream,
	createWriteStream,
	existsSync,
	openSync,
} from "node:fs";
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

/** Normaliza COM1 / \\.\COM1\ → COM1. */
export function normalizarNomePorta(porta: string): string {
	return porta
		.trim()
		.toUpperCase()
		.replace(/^\\\\.\\/, "")
		.replace(/\\+$/g, "")
		.replace(/\/+$/g, "");
}

function traduzirErroPorta(porta: string, err: unknown): Error {
	const message = err instanceof Error ? err.message : String(err);
	const lower = message.toLowerCase();
	if (
		lower.includes("access") ||
		lower.includes("denied") ||
		lower.includes("eperm") ||
		lower.includes("eacces") ||
		lower.includes("in use") ||
		lower.includes("sharing violation") ||
		lower.includes("unauthorized")
	) {
		return new Error(
			`Sem permissão para abrir ${porta}. Feche o programa que estiver usando a porta (teste da balança, HyperTerminal, outro PDV) e tente de novo.`,
		);
	}
	if (
		lower.includes("does not exist") ||
		lower.includes("file not found") ||
		lower.includes("enoent") ||
		lower.includes("cannot find") ||
		lower.includes("no such file") ||
		lower.includes("não encontr") ||
		lower.includes("nao encontr")
	) {
		return new Error(
			`Porta ${porta} não encontrada. Confira a COM da balança no Gerenciador de Dispositivos.`,
		);
	}
	return new Error(`Falha na porta ${porta}: ${message}`);
}

function powershellExe(): string {
	const root = process.env.SystemRoot || "C:\\Windows";
	return `${root}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
}

const HOST_PS = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
$port = $null
function Out-Line([string]$s) {
  [Console]::Out.WriteLine($s)
  [Console]::Out.Flush()
}
try {
  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    $line = $line.Trim()
    if ($line -eq '') { continue }
    $parts = $line.Split(' ', 3)
    $cmd = $parts[0].ToUpperInvariant()
    try {
      switch ($cmd) {
        'OPEN' {
          if ($port) { $port.Close(); $port.Dispose(); $port = $null }
          $nome = $parts[1]
          $baud = [int]$parts[2]
          $port = New-Object System.IO.Ports.SerialPort $nome, $baud, ([System.IO.Ports.Parity]::None), 8, ([System.IO.Ports.StopBits]::One)
          $port.Handshake = [System.IO.Ports.Handshake]::None
          $port.ReadTimeout = 50
          $port.WriteTimeout = 1000
          $port.DtrEnable = $true
          $port.RtsEnable = $true
          $port.Open()
          Out-Line 'OK OPEN'
        }
        'WRITE' {
          $bytes = [Convert]::FromBase64String($parts[1])
          $port.Write($bytes, 0, $bytes.Length)
          Out-Line 'OK WRITE'
        }
        'READ' {
          $n = $port.BytesToRead
          if ($n -le 0) { Out-Line 'OK READ'; continue }
          $buf = New-Object byte[] $n
          $got = $port.Read($buf, 0, $n)
          Out-Line ('OK READ ' + [Convert]::ToBase64String($buf, 0, $got))
        }
        'CLOSE' {
          if ($port) { $port.Close(); $port.Dispose(); $port = $null }
          Out-Line 'OK CLOSE'
        }
        'QUIT' {
          if ($port) { $port.Close(); $port.Dispose(); $port = $null }
          Out-Line 'OK QUIT'
          break
        }
        default { Out-Line 'ERR comando desconhecido' }
      }
    } catch {
      $msg = $_.Exception.Message.Replace([char]13, ' ').Replace([char]10, ' ')
      Out-Line ('ERR ' + $msg)
    }
  }
} finally {
  if ($port) { try { $port.Close(); $port.Dispose() } catch {} }
}
`.trim();

type EsperaLinha = {
	resolve: (line: string) => void;
	reject: (err: Error) => void;
};

class SessaoSerialWin {
	private child: ChildProcessWithoutNullStreams;
	private fila: EsperaLinha[] = [];
	private restante = "";
	private morto = false;

	private constructor(child: ChildProcessWithoutNullStreams) {
		this.child = child;
		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => this.receber(chunk));
		child.stderr.on("data", () => undefined);
		child.on("exit", () => {
			this.morto = true;
			const erro = new Error("O helper da porta serial encerrou.");
			for (const espera of this.fila.splice(0)) {
				espera.reject(erro);
			}
		});
	}

	static iniciar(): SessaoSerialWin {
		const encoded = Buffer.from(HOST_PS, "utf16le").toString("base64");
		const child = spawn(
			powershellExe(),
			["-NoProfile", "-STA", "-EncodedCommand", encoded],
			{
				stdio: ["pipe", "pipe", "pipe"],
				windowsHide: true,
			},
		);
		return new SessaoSerialWin(child);
	}

	private receber(chunk: string) {
		this.restante += chunk;
		let idx = this.restante.indexOf("\n");
		while (idx >= 0) {
			const line = this.restante.slice(0, idx).replace(/\r$/, "");
			this.restante = this.restante.slice(idx + 1);
			if (line) {
				const espera = this.fila.shift();
				if (espera) espera.resolve(line);
			}
			idx = this.restante.indexOf("\n");
		}
	}

	async comando(cmd: string, timeoutMs = 8000): Promise<string> {
		if (this.morto) {
			throw new Error("O helper da porta serial encerrou.");
		}
		const line = await new Promise<string>((resolve, reject) => {
			const timer = setTimeout(() => {
				const i = this.fila.indexOf(espera);
				if (i >= 0) this.fila.splice(i, 1);
				reject(new Error("Tempo esgotado na porta serial"));
			}, timeoutMs);
			const espera: EsperaLinha = {
				resolve: (valor) => {
					clearTimeout(timer);
					resolve(valor);
				},
				reject: (err) => {
					clearTimeout(timer);
					reject(err);
				},
			};
			this.fila.push(espera);
			this.child.stdin.write(`${cmd}\n`);
		});
		if (line.startsWith("ERR ")) {
			throw new Error(line.slice(4).trim());
		}
		return line;
	}

	async fecharProcesso() {
		try {
			await this.comando("QUIT", 1500);
		} catch {
			// já morto
		}
		if (!this.morto) {
			this.child.kill();
		}
	}
}

function coletarComs(texto: string): string[] {
	const encontradas = new Set<string>();
	for (const linha of texto.split(/\r?\n/)) {
		const nome = normalizarNomePorta(linha.replace(/,$/, ""));
		if (/^COM\d+$/.test(nome)) encontradas.add(nome);
		for (const parte of linha.split(/[,\s;]+/)) {
			const item = normalizarNomePorta(parte);
			if (/^COM\d+$/.test(item)) encontradas.add(item);
		}
	}
	return [...encontradas].sort(
		(a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
	);
}

async function listarPortasWindows(): Promise<string[]> {
	const encontradas = new Set<string>();
	const comandos = [
		"[System.IO.Ports.SerialPort]::GetPortNames()",
		"Get-CimInstance Win32_SerialPort | ForEach-Object { $_.DeviceID }",
	];
	for (const comando of comandos) {
		try {
			const { stdout } = await execFileAsync(powershellExe(), [
				"-NoProfile",
				"-Command",
				comando,
			]);
			for (const nome of coletarComs(stdout)) encontradas.add(nome);
		} catch {
			// tenta o próximo enumerador
		}
	}
	return [...encontradas].sort(
		(a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
	);
}

export async function listarPortasSeriais(): Promise<string[]> {
	if (process.platform === "win32") {
		return listarPortasWindows();
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

async function abrirPortaWindows(
	nome: string,
	baud: number,
): Promise<PortaSerialAberta> {
	const sessao = SessaoSerialWin.iniciar();
	try {
		await sessao.comando(`OPEN ${nome} ${baud}`, 8000);
	} catch (err) {
		await sessao.fecharProcesso().catch(() => undefined);
		throw traduzirErroPorta(nome, err);
	}

	return {
		path: nome,
		async ler() {
			const line = await sessao.comando("READ", 2000);
			const b64 = line.startsWith("OK READ")
				? line.slice("OK READ".length).trim()
				: "";
			return b64 ? Buffer.from(b64, "base64") : Buffer.alloc(0);
		},
		async escrever(dados) {
			await sessao.comando(`WRITE ${dados.toString("base64")}`, 2000);
		},
		async fechar() {
			try {
				await sessao.comando("CLOSE", 1500);
			} catch {
				// já fechada
			}
			await sessao.fecharProcesso().catch(() => undefined);
		},
	};
}

async function configurarBaudPosix(path: string, baud: number): Promise<void> {
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

async function abrirPortaPosix(
	path: string,
	baud: number,
): Promise<PortaSerialAberta> {
	if (!existsSync(path)) {
		throw new Error(`Porta ${path} não encontrada.`);
	}
	await configurarBaudPosix(path, baud);

	let fd: number;
	try {
		fd = openSync(path, "r+");
	} catch (err) {
		throw traduzirErroPorta(path, err);
	}

	let leitura: Readable;
	let escrita: Writable;
	try {
		leitura = createReadStream("", {
			fd,
			autoClose: false,
			highWaterMark: 256,
		});
		escrita = createWriteStream("", { fd, autoClose: false });
	} catch (err) {
		try {
			closeSync(fd);
		} catch {
			// já fechado
		}
		throw traduzirErroPorta(path, err);
	}

	let buffer = Buffer.alloc(0);
	leitura.on("data", (chunk: string | Buffer) => {
		const parte = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
		buffer = Buffer.concat([buffer, parte]);
		if (buffer.length > 4096) {
			buffer = buffer.subarray(buffer.length - 2048);
		}
	});

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
			try {
				closeSync(fd);
			} catch {
				// já fechado
			}
		},
	};
}

export async function abrirPortaSerial(
	porta: string,
	baud = 9600,
): Promise<PortaSerialAberta> {
	const nome = normalizarNomePorta(porta);
	if (!nome) {
		throw new Error("Informe a porta da balança.");
	}
	if (process.platform === "win32") {
		return abrirPortaWindows(nome, baud);
	}
	return abrirPortaPosix(porta.trim(), baud);
}
