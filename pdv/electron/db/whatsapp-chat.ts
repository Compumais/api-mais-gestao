import { v4 as uuidv4 } from "uuid";
import {
	sufixosBuscaTelefone,
	variantesTelefoneE164,
} from "../integracao/whatsapp/normalizar-telefone";
import { execute, query, queryOne } from "./database";

export type WhatsappSessaoStatus =
	| "desconectado"
	| "aguardando_qr"
	| "conectado"
	| "erro";

export type WhatsappSessaoLocal = {
	id: number;
	status: WhatsappSessaoStatus;
	ultimo_qr: string | null;
	ultimo_erro: string | null;
	atualizadoem: string;
};

export type WhatsappConversaLocal = {
	id: string;
	idconta: string | null;
	telefone_e164: string;
	nao_lidas: number;
	ultima_mensagem_em: string | null;
	criadoem: string;
};

export type WhatsappMensagemLocal = {
	id: string;
	idconversa: string;
	direcao: "in" | "out" | "system";
	corpo: string;
	status_envio: string | null;
	wa_message_id: string | null;
	lida: number;
	criadoem: string;
};

export async function garantirWhatsappSessao(): Promise<WhatsappSessaoLocal> {
	const agora = new Date().toISOString();
	await execute(
		`INSERT INTO whatsapp_sessao (id, status, atualizadoem)
		 VALUES (1, 'desconectado', $1)
		 ON CONFLICT (id) DO NOTHING`,
		[agora],
	);
	const row = await queryOne<WhatsappSessaoLocal>(
		"SELECT * FROM whatsapp_sessao WHERE id = 1",
	);
	if (!row) {
		throw new Error("Falha ao inicializar sessão WhatsApp");
	}
	return row;
}

export async function obterWhatsappSessao(): Promise<WhatsappSessaoLocal> {
	return garantirWhatsappSessao();
}

export async function atualizarWhatsappSessao(dados: {
	status?: WhatsappSessaoStatus;
	ultimo_qr?: string | null;
	ultimo_erro?: string | null;
}): Promise<WhatsappSessaoLocal> {
	await garantirWhatsappSessao();
	const atual = await obterWhatsappSessao();
	const status = dados.status ?? atual.status;
	const ultimo_qr =
		dados.ultimo_qr !== undefined ? dados.ultimo_qr : atual.ultimo_qr;
	const ultimo_erro =
		dados.ultimo_erro !== undefined ? dados.ultimo_erro : atual.ultimo_erro;
	const agora = new Date().toISOString();
	await execute(
		`UPDATE whatsapp_sessao
		 SET status = $1, ultimo_qr = $2, ultimo_erro = $3, atualizadoem = $4
		 WHERE id = 1`,
		[status, ultimo_qr, ultimo_erro, agora],
	);
	return obterWhatsappSessao();
}

export async function buscarConversaPorTelefone(
	telefoneE164: string,
): Promise<WhatsappConversaLocal | null> {
	const exact = await queryOne<WhatsappConversaLocal>(
		`SELECT * FROM whatsapp_conversa WHERE telefone_e164 = $1 LIMIT 1`,
		[telefoneE164],
	);
	if (exact) return exact;
	for (const variante of variantesTelefoneE164(telefoneE164)) {
		if (variante === telefoneE164) continue;
		const row = await queryOne<WhatsappConversaLocal>(
			`SELECT * FROM whatsapp_conversa WHERE telefone_e164 = $1 LIMIT 1`,
			[variante],
		);
		if (row) return row;
	}
	return null;
}

export async function buscarConversaPorConta(
	idconta: string,
): Promise<WhatsappConversaLocal | null> {
	return (
		(await queryOne<WhatsappConversaLocal>(
			`SELECT * FROM whatsapp_conversa WHERE idconta = $1 LIMIT 1`,
			[idconta],
		)) ?? null
	);
}

export async function obterOuCriarConversa(params: {
	telefoneE164: string;
	idconta?: string | null;
}): Promise<WhatsappConversaLocal> {
	if (params.idconta) {
		const porConta = await buscarConversaPorConta(params.idconta);
		if (porConta) return porConta;
	}
	const existente = await buscarConversaPorTelefone(params.telefoneE164);
	if (existente) {
		if (params.idconta && existente.idconta !== params.idconta) {
			await execute(`UPDATE whatsapp_conversa SET idconta = $1 WHERE id = $2`, [
				params.idconta,
				existente.id,
			]);
			return (
				(await buscarConversaPorTelefone(params.telefoneE164)) ?? existente
			);
		}
		return existente;
	}
	const agora = new Date().toISOString();
	const id = uuidv4();
	await execute(
		`INSERT INTO whatsapp_conversa (
			id, idconta, telefone_e164, nao_lidas, ultima_mensagem_em, criadoem
		) VALUES ($1, $2, $3, 0, NULL, $4)`,
		[id, params.idconta ?? null, params.telefoneE164, agora],
	);
	const criada = await queryOne<WhatsappConversaLocal>(
		`SELECT * FROM whatsapp_conversa WHERE id = $1`,
		[id],
	);
	if (!criada) {
		throw new Error("Falha ao criar conversa WhatsApp");
	}
	return criada;
}

export async function registrarMensagemWhatsapp(params: {
	idconversa: string;
	direcao: "in" | "out" | "system";
	corpo: string;
	statusEnvio?: string | null;
	waMessageId?: string | null;
	incrementarNaoLidas?: boolean;
}): Promise<WhatsappMensagemLocal> {
	const agora = new Date().toISOString();
	const id = uuidv4();
	const lida = params.direcao === "in" && params.incrementarNaoLidas ? 0 : 1;
	await execute(
		`INSERT INTO whatsapp_mensagem (
			id, idconversa, direcao, corpo, status_envio, wa_message_id, lida, criadoem
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		[
			id,
			params.idconversa,
			params.direcao,
			params.corpo,
			params.statusEnvio ?? null,
			params.waMessageId ?? null,
			lida,
			agora,
		],
	);
	if (params.direcao === "in" && params.incrementarNaoLidas) {
		await execute(
			`UPDATE whatsapp_conversa
			 SET nao_lidas = nao_lidas + 1, ultima_mensagem_em = $1
			 WHERE id = $2`,
			[agora, params.idconversa],
		);
	} else {
		await execute(
			`UPDATE whatsapp_conversa SET ultima_mensagem_em = $1 WHERE id = $2`,
			[agora, params.idconversa],
		);
	}
	const msg = await queryOne<WhatsappMensagemLocal>(
		`SELECT * FROM whatsapp_mensagem WHERE id = $1`,
		[id],
	);
	if (!msg) {
		throw new Error("Falha ao registrar mensagem");
	}
	return msg;
}

export async function listarMensagensConversa(
	idconversa: string,
	limite = 100,
): Promise<WhatsappMensagemLocal[]> {
	return query<WhatsappMensagemLocal>(
		`SELECT * FROM whatsapp_mensagem
		 WHERE idconversa = $1
		 ORDER BY criadoem ASC
		 LIMIT $2`,
		[idconversa, Math.max(1, Math.min(limite, 500))],
	);
}

export async function marcarConversaLida(idconversa: string): Promise<void> {
	await execute(
		`UPDATE whatsapp_mensagem SET lida = 1 WHERE idconversa = $1 AND lida = 0`,
		[idconversa],
	);
	await execute(`UPDATE whatsapp_conversa SET nao_lidas = 0 WHERE id = $1`, [
		idconversa,
	]);
}

export async function contarNaoLidasWhatsapp(): Promise<number> {
	const row = await queryOne<{ total: string | number }>(
		`SELECT COALESCE(SUM(nao_lidas), 0) AS total FROM whatsapp_conversa`,
	);
	return Number(row?.total ?? 0);
}

export async function naoLidasPorConta(): Promise<
	Array<{ idconta: string; nao_lidas: number }>
> {
	const rows = await query<{ idconta: string; nao_lidas: number }>(
		`SELECT idconta, nao_lidas
		 FROM whatsapp_conversa
		 WHERE idconta IS NOT NULL AND nao_lidas > 0`,
	);
	return rows.map((r) => ({
		idconta: r.idconta,
		nao_lidas: Number(r.nao_lidas) || 0,
	}));
}

export async function buscarContaAbertaPorTelefone(
	telefoneE164: string,
): Promise<{
	id: string;
	nomecliente: string | null;
	telefone: string | null;
} | null> {
	const sufixos = sufixosBuscaTelefone(telefoneE164);
	if (!sufixos.length) return null;
	for (const sufixo of sufixos) {
		const row = await queryOne<{
			id: string;
			nomecliente: string | null;
			telefone: string | null;
		}>(
			`SELECT id, nomecliente, telefone
			 FROM conta_mesa
			 WHERE status = 'aberta'
			   AND modalidade IN ('delivery', 'retirada')
			   AND regexp_replace(COALESCE(telefone, ''), '[^0-9]', '', 'g') LIKE $1
			 ORDER BY abertoem DESC
			 LIMIT 1`,
			[`%${sufixo}`],
		);
		if (row) return row;
	}
	return null;
}
