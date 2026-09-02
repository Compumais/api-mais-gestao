import { Buffer } from "node:buffer";
import net from "node:net";
import { BrowserWindow } from "electron";
import { execute } from "../db/database";
import { MARCADOR_QR_DANFCE } from "./danfce-layout";
import { bytesQrEscpos } from "./qr-escpos";

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

function montarEscpos(
	texto: string,
	qrcode?: string,
	opcoes?: { fonteMenor?: boolean },
): Buffer {
	const init = Buffer.from([0x1b, 0x40]);
	const codepage = Buffer.from([0x1b, 0x74, 0x10]);
	/** Font B — tipicamente ~9x17 vs Font A 12x24 (fonte um pouco menor). */
	const fontB = Buffer.from([0x1b, 0x4d, 0x01]);
	const alignCenter = Buffer.from([0x1b, 0x61, 0x01]);
	const alignLeft = Buffer.from([0x1b, 0x61, 0x00]);
	const avanco = Buffer.from([0x1b, 0x64, 0x04]);
	const corte = Buffer.from([0x1d, 0x56, 0x41, 0x03]);
	const partes: Buffer[] = [init, codepage];
	if (opcoes?.fonteMenor) {
		partes.push(fontB);
	}
	const qr = qrcode?.trim() ?? "";
	const chunks = texto.split(MARCADOR_QR_DANFCE);
	chunks.forEach((chunk, idx) => {
		if (chunk) {
			partes.push(paraLatin1(chunk.replace(/\n/g, "\r\n")));
		}
		if (idx < chunks.length - 1 && qr) {
			partes.push(alignCenter, bytesQrEscpos(qr), alignLeft);
		}
	});
	partes.push(avanco, corte);
	return Buffer.concat(partes);
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

function htmlCupomSimples(
	texto: string,
	opcoes?: { fonteMenor?: boolean },
): string {
	const fonteMenor = Boolean(opcoes?.fonteMenor);
	const fontSize = fonteMenor ? "11pt" : "15pt";
	const lineHeight = fonteMenor ? "1.15" : "1.3";
	return `<!DOCTYPE html>
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
    font-size: ${fontSize}; line-height: ${lineHeight}; font-weight: 600;
    white-space: pre-wrap; word-break: break-word;
  }
</style>
</head>
<body><pre>${escapeHtml(texto)}</pre></body>
</html>`;
}

async function enviarSpoolerWindows(
	html: string,
	deviceNamePreferido?: string,
): Promise<{ ok: boolean; modo: string }> {
	const win = new BrowserWindow({
		show: false,
		webPreferences: { offscreen: true },
	});
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

async function enviarParaDestino(params: {
	texto: string;
	html: string;
	destino: DestinoImpressora;
	qrcode?: string;
	estrito?: boolean;
	fonteMenor?: boolean;
}): Promise<{ ok: boolean; modo: string }> {
	const { texto, html, destino, qrcode, estrito, fonteMenor } = params;
	const textoArquivo = texto.replaceAll(
		MARCADOR_QR_DANFCE,
		qrcode ? "[QR CODE NFC-e]" : "",
	);
	if (destino.tipo === "arquivo") {
		await gravarBufferLocal(textoArquivo);
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
		await gravarBufferLocal(textoArquivo);
		return { ok: true, modo: "buffer_local" };
	}

	if (destino.tipo === "rede") {
		const { host, porta } = normalizarHostPorta(
			destino.host ?? "",
			destino.porta,
		);
		await enviarRawTcp(
			host,
			porta,
			montarEscpos(texto, qrcode, { fonteMenor }),
		);
		return { ok: true, modo: "rede" };
	}

	try {
		return await enviarSpoolerWindows(html, destino.nome);
	} catch (err) {
		if (estrito) {
			throw err;
		}
		await gravarBufferLocal(textoArquivo);
		return { ok: true, modo: "buffer_local" };
	}
}

export async function enviarTextoImpressora(
	texto: string,
	destino: DestinoImpressora,
	opcoes?: { estrito?: boolean; fonteMenor?: boolean },
): Promise<{ ok: boolean; modo: string }> {
	const fonteMenor = Boolean(opcoes?.fonteMenor);
	return enviarParaDestino({
		texto,
		html: htmlCupomSimples(texto, { fonteMenor }),
		destino,
		estrito: Boolean(opcoes?.estrito),
		fonteMenor,
	});
}

export async function enviarDanfceImpressora(
	params: {
		texto: string;
		html: string;
		qrcode?: string;
	},
	destino: DestinoImpressora,
	opcoes?: { estrito?: boolean },
): Promise<{ ok: boolean; modo: string }> {
	return enviarParaDestino({
		texto: params.texto,
		html: params.html,
		qrcode: params.qrcode,
		destino,
		estrito: Boolean(opcoes?.estrito),
	});
}
