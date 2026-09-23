import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import { getConfig, isDbReady, setConfig } from "../../db/database";
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

type SockWs = {
	isOpen?: boolean;
	isConnecting?: boolean;
	isClosed?: boolean;
	isClosing?: boolean;
	socket?: {
		readyState?: number;
		terminate?: () => void;
	} | null;
};

type SockLike = {
	sendMessage: (
		jid: string,
		content: { text: string },
	) => Promise<{ key?: { id?: string | null } } | undefined>;
	end: (error?: Error) => void;
	ws?: SockWs;
	ev: {
		on: (event: string, listener: (...args: unknown[]) => void) => void;
		off: (event: string, listener: (...args: unknown[]) => void) => void;
		removeAllListeners: (event?: string) => void;
	};
};

type ListenerPair = {
	event: string;
	listener: (...args: unknown[]) => void;
};

let sock: SockLike | null = null;
let sockListeners: ListenerPair[] = [];
let iniciando = false;
/** Evita auto-reconexão enquanto paramos/desconectamos de propósito. */
let parando = false;
/** Serializa conectarSocket — awaits lentos (auth/versão) causavam race que matava o QR. */
let conectarPromise: Promise<void> | null = null;
let filaTimer: NodeJS.Timeout | null = null;
let statusRuntime: StatusWhatsappRuntime = {
	habilitado: false,
	status: "desconectado",
	ultimoQr: null,
	ultimoErro: null,
	conectado: false,
	atualizadoem: null,
};

function authDirPath(): string {
	return join(app.getPath("userData"), "whatsapp-auth");
}

function emitirEvento(payload: Record<string, unknown>) {
	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send("whatsapp:evento", payload);
	}
}

function registrarListener(
	socket: SockLike,
	event: string,
	listener: (...args: unknown[]) => void,
): void {
	socket.ev.on(event, listener);
	sockListeners.push({ event, listener });
}

function removerListenersSocket(socket: SockLike | null): void {
	if (!socket) {
		sockListeners = [];
		return;
	}
	for (const { event, listener } of sockListeners) {
		try {
			socket.ev.off(event, listener);
		} catch {
			// ignore
		}
	}
	sockListeners = [];
}

/**
 * Fecha o socket Baileys sem derrubar o processo.
 * Chamar end()/ws.close() com WebSocket em CONNECTING rejeita de forma
 * assíncrona e vira Uncaught Exception no Electron.
 *
 * NÃO usa removeAllListeners() no EventEmitter do Baileys — isso apaga o
 * bridge interno `event` → `connection.update` e engole o QR.
 */
function fecharSocketSeguro(socket: SockLike | null): void {
	if (!socket) return;
	removerListenersSocket(socket);
	try {
		const ws = socket.ws;
		const raw = ws?.socket;
		const connecting =
			ws?.isConnecting === true ||
			raw?.readyState === 0; /* WebSocket.CONNECTING */
		if (connecting) {
			try {
				raw?.terminate?.();
			} catch {
				// ignore
			}
			if (ws) {
				ws.socket = null;
			}
			return;
		}
		if (ws?.isOpen) {
			try {
				socket.end(undefined);
			} catch {
				// ignore
			}
		}
	} catch {
		// ignore
	}
}

function aplicarStatusRuntime(parcial: {
	status?: WhatsappSessaoStatus;
	ultimo_qr?: string | null;
	ultimo_erro?: string | null;
}): void {
	if (parcial.status !== undefined) {
		statusRuntime.status = parcial.status;
		statusRuntime.conectado = parcial.status === "conectado";
	}
	if (parcial.ultimo_qr !== undefined) {
		statusRuntime.ultimoQr = parcial.ultimo_qr;
	}
	if (parcial.ultimo_erro !== undefined) {
		statusRuntime.ultimoErro = parcial.ultimo_erro;
	}
	statusRuntime.atualizadoem = new Date().toISOString();
}

async function persistirStatus(parcial: {
	status?: WhatsappSessaoStatus;
	ultimo_qr?: string | null;
	ultimo_erro?: string | null;
}) {
	// Runtime primeiro: a UI faz poll e o evento pode sair antes do DB.
	aplicarStatusRuntime(parcial);
	emitirEvento({ tipo: "status", ...statusRuntime });
	if (!isDbReady()) return;
	try {
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
	} catch (err) {
		console.error(
			"[whatsapp] falha ao persistir status:",
			err instanceof Error ? err.message : err,
		);
	}
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
	parando = false;
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
	parando = true;
	if (filaTimer) {
		clearInterval(filaTimer);
		filaTimer = null;
	}
	const atual = sock;
	sock = null;
	fecharSocketSeguro(atual);
	await persistirStatus({
		status: "desconectado",
		ultimo_qr: null,
		ultimo_erro: null,
	});
}

/**
 * @param limparAuth Quando true (botão "Conectar / gerar QR"), apaga credenciais
 * parciais que impedem o Baileys de emitir o evento `qr`.
 */
export async function reconectarWhatsapp(
	opts: { limparAuth?: boolean } = {},
): Promise<void> {
	await pararWhatsapp();
	if (opts.limparAuth !== false) {
		try {
			rmSync(authDirPath(), { recursive: true, force: true });
		} catch {
			// ignore
		}
	}
	if (isDbReady()) {
		// "Conectar / gerar QR" sempre habilita a integração.
		await setConfig("whatsapp_habilitado", "1");
		statusRuntime.habilitado = true;
	}
	await iniciarWhatsapp();
}

export async function desconectarWhatsapp(): Promise<void> {
	await pararWhatsapp();
	try {
		rmSync(authDirPath(), { recursive: true, force: true });
	} catch {
		// ignore
	}
}

async function conectarSocket(): Promise<void> {
	// Se já há conexão em andamento, espera; se ela foi abortada (parando) ou
	// não deixou sock, tenta de novo em vez de retornar em falso-sucesso.
	while (conectarPromise) {
		await conectarPromise.catch(() => undefined);
		if (parando || sock) return;
	}
	if (parando) return;

	const estaRodada = (async () => {
		if (parando) return;

		// Fecha o socket anterior ANTES dos awaits lentos (auth/versão),
		// evitando race que matava a sessão no meio do pair-device/QR.
		if (sock) {
			const antigo = sock;
			sock = null;
			fecharSocketSeguro(antigo);
		}

		await persistirStatus({
			status: "aguardando_qr",
			ultimo_erro: null,
		});

		let baileys: typeof import("@whiskeysockets/baileys");
		try {
			baileys = await import("@whiskeysockets/baileys");
		} catch (err) {
			const mensagem =
				err instanceof Error && /Cannot find package/i.test(err.message)
					? "Pacote WhatsApp (@whiskeysockets/baileys) não está instalado. No diretório pdv, rode npm install."
					: err instanceof Error
						? err.message
						: "Falha ao carregar o WhatsApp";
			await persistirStatus({
				status: "erro",
				ultimo_erro: mensagem,
			});
			throw new Error(mensagem);
		}
		const makeWASocket = baileys.makeWASocket ?? baileys.default;
		const {
			useMultiFileAuthState,
			DisconnectReason,
			fetchLatestBaileysVersion,
		} = baileys;

		const authDir = authDirPath();
		mkdirSync(authDir, { recursive: true });
		const { state, saveCreds } = await useMultiFileAuthState(authDir);
		let version: [number, number, number];
		try {
			const latest = await fetchLatestBaileysVersion();
			version = latest.version as [number, number, number];
		} catch {
			version = [2, 3000, 1023223821];
		}

		if (parando) return;

		const socket = makeWASocket({
			version,
			auth: state,
			printQRInTerminal: false,
			syncFullHistory: false,
			markOnlineOnConnect: false,
			connectTimeoutMs: 60_000,
			qrTimeout: 60_000,
		}) as unknown as SockLike;
		if (parando) {
			fecharSocketSeguro(socket);
			return;
		}
		sock = socket;

		registrarListener(socket, "creds.update", () => {
			void saveCreds();
		});

		registrarListener(socket, "connection.update", (...args: unknown[]) => {
			const update = (args[0] ?? {}) as {
				connection?: string;
				lastDisconnect?: { error?: { output?: { statusCode?: number } } };
				qr?: string;
			};
			void (async () => {
				if (parando) return;
				if (update.qr) {
					console.info("[whatsapp] QR recebido do Baileys");
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
					const qrAtual = statusRuntime.ultimoQr;
					// Não apaga o QR em queda transitória — a UI continua mostrando
					// até chegar um novo QR ou a sessão abrir/desconectar de propósito.
					await persistirStatus({
						status: loggedOut
							? "desconectado"
							: qrAtual
								? "aguardando_qr"
								: "erro",
						ultimo_qr: loggedOut ? null : qrAtual,
						ultimo_erro: loggedOut
							? "Sessão encerrada no celular"
							: qrAtual
								? null
								: `Conexão fechada (${code ?? "?"})`,
					});
					if (sock === socket) {
						sock = null;
						sockListeners = [];
					}
					if (parando || loggedOut) return;
					if (!(await whatsappHabilitado())) return;
					setTimeout(() => {
						if (parando || sock || conectarPromise) return;
						void conectarSocket().catch(async (err) => {
							await persistirStatus({
								status: "erro",
								ultimo_erro: err instanceof Error ? err.message : String(err),
							});
						});
					}, 3000);
				}
			})();
		});

		registrarListener(socket, "messages.upsert", (...args: unknown[]) => {
			const payload = (args[0] ?? {}) as {
				messages?: Array<{
					key?: {
						remoteJid?: string | null;
						fromMe?: boolean | null;
						id?: string | null;
					};
					message?: {
						conversation?: string;
						extendedTextMessage?: { text?: string };
					};
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
	})();

	conectarPromise = estaRodada;
	try {
		await estaRodada;
	} finally {
		if (conectarPromise === estaRodada) {
			conectarPromise = null;
		}
	}
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
		tipo = params.modalidade === "retirada" ? "retirada_pronta" : "entregue";
	} else if (params.statusEntrega === "cancelado") {
		tipo = "cancelado";
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
