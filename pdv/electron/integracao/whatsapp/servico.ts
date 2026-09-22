import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import { getConfig, isDbReady } from "../../db/database";
import {
	atualizarWhatsappSessao,
	buscarContaAbertaPorTelefone,
	garantirWhatsappSessao,
	obterOuCriarConversa,
	registrarMensagemWhatsapp,
	type WhatsappSessaoStatus,
} from "../../db/whatsapp-chat";
import {
	concluirItemFilaWhatsapp,
	enfileirarMensagemWhatsapp,
	obterProximoFilaWhatsapp,
	registrarFalhaFilaWhatsapp,
} from "./fila";
import {
	jidParaTelefone,
	normalizarTelefoneE164,
	telefoneParaJid,
} from "./normalizar-telefone";
import {
	montarMensagemTemplate,
	obterTemplateWhatsapp,
	type TemplateStatusWhatsapp,
} from "./templates";

export type StatusWhatsappRuntime = {
	habilitado: boolean;
	status: WhatsappSessaoStatus;
	ultimoQr: string | null;
	ultimoErro: string | null;
	conectado: boolean;
	atualizadoem: string | null;
};

type SockLike = {
	sendMessage: (
		jid: string,
		content: { text: string },
	) => Promise<{ key?: { id?: string | null } } | undefined>;
	end: (error?: Error) => void;
	ev: {
		on: (event: string, listener: (...args: unknown[]) => void) => void;
		removeAllListeners: (event?: string) => void;
	};
};

let sock: SockLike | null = null;
let iniciando = false;
let filaTimer: NodeJS.Timeout | null = null;
let statusRuntime: StatusWhatsappRuntime = {
	habilitado: false,
	status: "desconectado",
	ultimoQr: null,
	ultimoErro: null,
	conectado: false,
	atualizadoem: null,
};

function emitirEvento(payload: Record<string, unknown>) {
	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send("whatsapp:evento", payload);
	}
}

async function persistirStatus(parcial: {
	status?: WhatsappSessaoStatus;
	ultimo_qr?: string | null;
	ultimo_erro?: string | null;
}) {
	if (!isDbReady()) return;
	const row = await atualizarWhatsappSessao(parcial);
	statusRuntime = {
		...statusRuntime,
		status: row.status,
		ultimoQr: row.ultimo_qr,
		ultimoErro: row.ultimo_erro,
		conectado: row.status === "conectado",
		atualizadoem: row.atualizadoem,
	};
	emitirEvento({ tipo: "status", ...statusRuntime });
}

export function statusWhatsapp(): StatusWhatsappRuntime {
	return { ...statusRuntime };
}

export async function whatsappHabilitado(): Promise<boolean> {
	return (await getConfig("whatsapp_habilitado", "0")) === "1";
}

async function processarFila(): Promise<void> {
	if (!sock || statusRuntime.status !== "conectado") return;
	const item = obterProximoFilaWhatsapp();
	if (!item) return;
	try {
		await enviarTextoWhatsapp({
			telefoneE164: item.telefoneE164,
			corpo: item.corpo,
			idconta: item.idconta,
			origemFila: true,
		});
		concluirItemFilaWhatsapp(item.id);
	} catch {
		registrarFalhaFilaWhatsapp(item.id);
	}
}

export async function iniciarWhatsapp(): Promise<void> {
	if (iniciando) return;
	iniciando = true;
	try {
		if (!isDbReady()) return;
		await garantirWhatsappSessao();
		const habilitado = await whatsappHabilitado();
		statusRuntime.habilitado = habilitado;
		if (!habilitado) {
			await persistirStatus({
				status: "desconectado",
				ultimo_qr: null,
				ultimo_erro: null,
			});
			return;
		}
		await conectarSocket();
		if (!filaTimer) {
			filaTimer = setInterval(() => {
				void processarFila();
			}, 4000);
		}
	} finally {
		iniciando = false;
	}
}

export async function pararWhatsapp(): Promise<void> {
	if (filaTimer) {
		clearInterval(filaTimer);
		filaTimer = null;
	}
	if (sock) {
		try {
			sock.ev.removeAllListeners();
			sock.end(undefined);
		} catch {
			// ignore
		}
		sock = null;
	}
	await persistirStatus({
		status: "desconectado",
		ultimo_qr: null,
		ultimo_erro: null,
	});
}

export async function reconectarWhatsapp(): Promise<void> {
	await pararWhatsapp();
	await iniciarWhatsapp();
}

export async function desconectarWhatsapp(): Promise<void> {
	await pararWhatsapp();
}

async function conectarSocket(): Promise<void> {
	const baileys = await import("@whiskeysockets/baileys");
	const makeWASocket = baileys.makeWASocket ?? baileys.default;
	const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } =
		baileys;

	const authDir = join(app.getPath("userData"), "whatsapp-auth");
	mkdirSync(authDir, { recursive: true });
	const { state, saveCreds } = await useMultiFileAuthState(authDir);
	const { version } = await fetchLatestBaileysVersion();

	if (sock) {
		try {
			sock.ev.removeAllListeners();
			sock.end(undefined);
		} catch {
			// ignore
		}
		sock = null;
	}

	const socket = makeWASocket({
		version,
		auth: state,
		printQRInTerminal: false,
		syncFullHistory: false,
		markOnlineOnConnect: false,
	}) as unknown as SockLike & {
		ev: {
			on: (event: string, listener: (...args: unknown[]) => void) => void;
			removeAllListeners: (event?: string) => void;
		};
	};
	sock = socket;

	socket.ev.on("creds.update", () => {
		void saveCreds();
	});

	socket.ev.on("connection.update", (...args: unknown[]) => {
		const update = (args[0] ?? {}) as {
			connection?: string;
			lastDisconnect?: { error?: { output?: { statusCode?: number } } };
			qr?: string;
		};
		void (async () => {
			if (update.qr) {
				await persistirStatus({
					status: "aguardando_qr",
					ultimo_qr: update.qr,
					ultimo_erro: null,
				});
				emitirEvento({ tipo: "qr", qr: update.qr });
			}
			if (update.connection === "open") {
				await persistirStatus({
					status: "conectado",
					ultimo_qr: null,
					ultimo_erro: null,
				});
				void processarFila();
			}
			if (update.connection === "close") {
				const code = update.lastDisconnect?.error?.output?.statusCode;
				const loggedOut = code === DisconnectReason.loggedOut;
				await persistirStatus({
					status: loggedOut ? "desconectado" : "erro",
					ultimo_qr: null,
					ultimo_erro: loggedOut
						? "Sessão encerrada no celular"
						: `Conexão fechada (${code ?? "?"})`,
				});
				sock = null;
				if (!loggedOut && (await whatsappHabilitado())) {
					setTimeout(() => {
						void conectarSocket().catch(async (err) => {
							await persistirStatus({
								status: "erro",
								ultimo_erro:
									err instanceof Error ? err.message : String(err),
							});
						});
					}, 3000);
				}
			}
		})();
	});

	socket.ev.on("messages.upsert", (...args: unknown[]) => {
		const payload = (args[0] ?? {}) as {
			messages?: Array<{
				key?: { remoteJid?: string | null; fromMe?: boolean | null; id?: string | null };
				message?: { conversation?: string; extendedTextMessage?: { text?: string } };
			}>;
			type?: string;
		};
		if (payload.type !== "notify" || !payload.messages?.length) return;
		void (async () => {
			for (const msg of payload.messages) {
				if (msg.key?.fromMe) continue;
				const jid = msg.key?.remoteJid ?? "";
				if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") {
					continue;
				}
				const telefone = jidParaTelefone(jid);
				if (!telefone) continue;
				const texto =
					msg.message?.conversation ||
					msg.message?.extendedTextMessage?.text ||
					"";
				if (!texto.trim()) continue;
				const conta = await buscarContaAbertaPorTelefone(telefone);
				const conversa = await obterOuCriarConversa({
					telefoneE164: telefone,
					idconta: conta?.id ?? null,
				});
				await registrarMensagemWhatsapp({
					idconversa: conversa.id,
					direcao: "in",
					corpo: texto.trim(),
					waMessageId: msg.key?.id ?? null,
					incrementarNaoLidas: true,
				});
				emitirEvento({
					tipo: "mensagem",
					idconversa: conversa.id,
					idconta: conversa.idconta,
					telefone,
					direcao: "in",
				});
			}
		})();
	});
}

export async function enviarTextoWhatsapp(params: {
	telefoneE164: string;
	corpo: string;
	idconta?: string | null;
	origemFila?: boolean;
}): Promise<{ ok: boolean; enfileirado?: boolean }> {
	const telefone = normalizarTelefoneE164(params.telefoneE164);
	if (!telefone) {
		throw new Error("Telefone inválido");
	}
	const corpo = params.corpo.trim();
	if (!corpo) {
		throw new Error("Mensagem vazia");
	}
	const conversa = await obterOuCriarConversa({
		telefoneE164: telefone,
		idconta: params.idconta ?? null,
	});

	if (!sock || statusRuntime.status !== "conectado") {
		if (!params.origemFila) {
			enfileirarMensagemWhatsapp({
				telefoneE164: telefone,
				corpo,
				idconta: params.idconta,
			});
			await registrarMensagemWhatsapp({
				idconversa: conversa.id,
				direcao: "out",
				corpo,
				statusEnvio: "fila",
			});
			return { ok: true, enfileirado: true };
		}
		throw new Error("WhatsApp desconectado");
	}

	const resultado = await sock.sendMessage(telefoneParaJid(telefone), {
		text: corpo,
	});
	await registrarMensagemWhatsapp({
		idconversa: conversa.id,
		direcao: "out",
		corpo,
		statusEnvio: "enviado",
		waMessageId: resultado?.key?.id ?? null,
	});
	emitirEvento({
		tipo: "mensagem",
		idconversa: conversa.id,
		idconta: conversa.idconta,
		telefone,
		direcao: "out",
	});
	return { ok: true };
}

export async function notificarStatusPedidoWhatsapp(params: {
	idconta: string;
	telefone: string | null | undefined;
	nomecliente: string | null | undefined;
	protocolo: string | null | undefined;
	modalidade: string;
	statusEntrega: string;
}): Promise<void> {
	if (!(await whatsappHabilitado())) return;
	const telefone = normalizarTelefoneE164(params.telefone);
	if (!telefone) return;

	let tipo: TemplateStatusWhatsapp | null = null;
	if (params.statusEntrega === "producao") {
		tipo = "producao";
	} else if (params.statusEntrega === "saiu") {
		tipo = "saiu";
	} else if (params.statusEntrega === "entregue") {
		// Retirada não tem "saiu"; o avanço producao→entregue sinaliza "pronto".
		tipo =
			params.modalidade === "retirada" ? "retirada_pronta" : "entregue";
	}

	if (!tipo) return;
	const template = await obterTemplateWhatsapp(tipo);
	const corpo = montarMensagemTemplate(template, {
		nome: params.nomecliente,
		protocolo: params.protocolo,
	});
	await enviarTextoWhatsapp({
		telefoneE164: telefone,
		corpo,
		idconta: params.idconta,
	});
}
