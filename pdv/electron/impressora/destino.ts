import { Buffer } from "node:buffer";
import net from "node:net";
import { BrowserWindow } from "electron";
import { execute } from "../db/database";

export type TipoDestinoImpressora = "sistema" | "rede" | "arquivo";

export type DestinoImpressora = {
	tipo: TipoDestinoImpressora;
	nome?: string;
	host?: string;
	porta?: number;
};

function normalizarHostPorta(
	hostRaw: string,
	portaRaw?: number,
): { host: string; porta: number } {
	const trimmed = hostRaw.trim();
	const comPorta = trimmed.match(/^([^[\]]+):(\d+)$/);
	if (comPorta?.[1]) {
		return { host: comPorta[1], porta: Number(comPorta[2]) };
	}
	return {
		host: trimmed,
		porta: portaRaw && portaRaw > 0 ? portaRaw : 9100,
	};
}

export function chaveDestino(destino: DestinoImpressora): string {
	if (destino.tipo === "rede") {
		const { host, porta } = normalizarHostPorta(
			destino.host ?? "",
			destino.porta,
		);
		return `rede:${host}:${porta}`;
	}
	if (destino.tipo === "arquivo") {
		return "arquivo";
	}
	return `sistema:${destino.nome?.trim() ?? ""}`;
}

export function destinoPronto(destino: DestinoImpressora): boolean {
	if (destino.tipo === "rede") {
		return Boolean(destino.host?.trim());
	}
	if (destino.tipo === "arquivo") {
		return true;
	}
	return destino.tipo === "sistema";
}

function paraLatin1(texto: string): Buffer {
	const bytes = [...texto].map((c) => {
		const code = c.codePointAt(0) ?? 63;
		return code <= 255 ? code : 63;
	});
	return Buffer.from(bytes);
}

function montarEscpos(texto: string): Buffer {
	const init = Buffer.from([0x1b, 0x40]);
	const codepage = Buffer.from([0x1b, 0x74, 0x10]);
	const corpo = paraLatin1(texto.replace(/\n/g, "\r\n"));
	const avanco = Buffer.from([0x1b, 0x64, 0x04]);
	const corte = Buffer.from([0x1d, 0x56, 0x41, 0x03]);
	return Buffer.concat([init, codepage, corpo, avanco, corte]);
}

async function enviarRawTcp(
	host: string,
	porta: number,
	dados: Buffer,
): Promise<void> {
	try {
		await new Promise<void>((resolve, reject) => {
			let finalizado = false;
			const socket = net.connect({ host, port: porta });
			const finalizar = (err?: Error) => {
				if (finalizado) {
					return;
				}
				finalizado = true;
				clearTimeout(timer);
				if (err) {
					socket.destroy();
					reject(err);
					return;
				}
				resolve();
			};
			const timer = setTimeout(() => {
				finalizar(new Error(`Timeout ao conectar em ${host}:${porta}`));
			}, 5000);
			socket.once("connect", () => {
				socket.write(dados, (err) => {
					if (err) {
						finalizar(err);
						return;
					}
					socket.end(() => finalizar());
				});
			});
			socket.once("error", (err) => {
				finalizar(err instanceof Error ? err : new Error(String(err)));
			});
		});
	} catch (err) {
		const detalhe = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Não foi possível imprimir em ${host}:${porta}. ${detalhe}`,
		);
	}
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

async function enviarSpoolerWindows(
	texto: string,
	deviceNamePreferido?: string,
): Promise<{ ok: boolean; modo: string }> {
	const win = new BrowserWindow({
		show: false,
		webPreferences: { offscreen: true },
	});
	const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: 80mm auto; margin: 2mm; }
  html, body {
    margin: 0; padding: 0; width: 76mm;
    background: #fff; color: #000;
  }
  pre {
    margin: 0; padding: 0;
    font-family: "Courier New", Courier, monospace;
    font-size: 15pt; line-height: 1.3; font-weight: 600;
    white-space: pre-wrap; word-break: break-word;
  }
</style>
</head>
<body><pre>${escapeHtml(texto)}</pre></body>
</html>`;
	try {
		await win.loadURL(
			`data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
		);
		const printers = await win.webContents.getPrintersAsync();
		const nome = deviceNamePreferido?.trim() || "";
		const deviceName =
			nome && printers.some((p) => p.name === nome)
				? nome
				: nome || printers.find((p) => p.isDefault)?.name;

		await new Promise<void>((resolve, reject) => {
			win.webContents.print(
				{
					silent: true,
					printBackground: false,
					deviceName,
					margins: { marginType: "none" },
					scaleFactor: 100,
					pageSize: { width: 80000, height: 297000 },
				},
				(success, failureReason) => {
					win.destroy();
					if (!success) {
						reject(new Error(failureReason || "Falha na impressão"));
						return;
					}
					resolve();
				},
			);
		});
		return { ok: true, modo: deviceName ? "sistema" : "padrao" };
	} catch (err) {
		try {
			win.destroy();
		} catch {
			// janela já destruída
		}
		throw err;
	}
}

async function gravarBufferLocal(texto: string): Promise<void> {
	await execute(
		`INSERT INTO sync_meta (chave, valor, atualizadoem) VALUES ('ultimo_cupom', $1, $2)
		 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizadoem = excluded.atualizadoem`,
		[texto, new Date().toISOString()],
	);
}

export async function enviarTextoImpressora(
	texto: string,
	destino: DestinoImpressora,
	opcoes?: { estrito?: boolean },
): Promise<{ ok: boolean; modo: string }> {
	const estrito = Boolean(opcoes?.estrito);
	if (destino.tipo === "arquivo") {
		await gravarBufferLocal(texto);
		return { ok: true, modo: "arquivo" };
	}
	if (!destinoPronto(destino)) {
		if (estrito) {
			throw new Error(
				destino.tipo === "rede"
					? "Informe o IP da impressora de rede"
					: "Selecione a impressora",
			);
		}
		await gravarBufferLocal(texto);
		return { ok: true, modo: "buffer_local" };
	}

	if (destino.tipo === "rede") {
		const { host, porta } = normalizarHostPorta(
			destino.host ?? "",
			destino.porta,
		);
		await enviarRawTcp(host, porta, montarEscpos(texto));
		return { ok: true, modo: "rede" };
	}

	try {
		return await enviarSpoolerWindows(texto, destino.nome);
	} catch (err) {
		if (estrito) {
			throw err;
		}
		await gravarBufferLocal(texto);
		return { ok: true, modo: "buffer_local" };
	}
}
