import nodemailer from "nodemailer";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarConfiguracaoSmtpAtivaInterna } from "@/service/email/buscar-configuracao-smtp.js";
import { descriptografarTexto } from "@/util/criptografia-certificado.js";
import {
	httpBadRequest,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type AnexoEmail = {
	filename: string;
	content: Buffer | string;
	contentType?: string;
};

export type EnviarEmailParametros = {
	idusuario?: string;
	idempresa: string;
	destinatario: string;
	assunto: string;
	texto?: string;
	html?: string;
	anexos?: AnexoEmail[];
	validarUsuario?: boolean;
};

export type ResultadoEnvioEmail = {
	messageId?: string;
	aceito: string[];
};

/**
 * Nodemailer `secure: true` = TLS desde o handshake (porta 465).
 * Porta 587 usa STARTTLS (`secure: false` + `requireTLS`).
 * Marcar "seguro" com porta 587 e `secure: true` causa ESOCKET/wrong version number.
 */
export function opcoesTlsSmtp(porta: number, seguro: boolean) {
	if (!seguro) {
		return { secure: false as const };
	}

	if (porta === 465) {
		return { secure: true as const };
	}

	return {
		secure: false as const,
		requireTLS: true,
	};
}

export async function criarTransporterSmtp(idempresa: string) {
	const config = await buscarConfiguracaoSmtpAtivaInterna(idempresa);

	if (!config) {
		return null;
	}

	const senha = descriptografarTexto(config.senha);
	const tls = opcoesTlsSmtp(config.porta, config.seguro);

	const transporter = nodemailer.createTransport({
		host: config.host,
		port: config.porta,
		...tls,
		auth: {
			user: config.usuario,
			pass: senha,
		},
	});

	return { transporter, config };
}

export async function enviarEmailService({
	idusuario,
	idempresa,
	destinatario,
	assunto,
	texto,
	html,
	anexos,
	validarUsuario = true,
}: EnviarEmailParametros): Promise<HttpResponse<ResultadoEnvioEmail>> {
	if (validarUsuario) {
		if (!idusuario) {
			return httpProibido();
		}

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			idusuario,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return httpProibido();
		}
	}

	const emailDestino = destinatario.trim();
	if (!emailDestino || !emailDestino.includes("@")) {
		return httpBadRequest("Destinatário de e-mail inválido");
	}

	if (!assunto.trim()) {
		return httpBadRequest("Assunto do e-mail é obrigatório");
	}

	if (!texto?.trim() && !html?.trim()) {
		return httpBadRequest("Informe o corpo do e-mail (texto ou HTML)");
	}

	const smtp = await criarTransporterSmtp(idempresa);

	if (!smtp) {
		return httpBadRequest(
			"SMTP não configurado ou inativo para esta empresa. Configure em Envio de e-mails.",
		);
	}

	const { transporter, config } = smtp;

	try {
		const info = await transporter.sendMail({
			from: config.nomremetente?.trim()
				? `"${config.nomremetente.trim()}" <${config.emailremetente}>`
				: config.emailremetente,
			to: emailDestino,
			subject: assunto.trim(),
			text: texto?.trim() || undefined,
			html: html?.trim() || undefined,
			attachments: anexos?.map((anexo) => ({
				filename: anexo.filename,
				content: anexo.content,
				contentType: anexo.contentType,
			})),
		});

		return httpOk({
			messageId: info.messageId,
			aceito: Array.isArray(info.accepted)
				? info.accepted.map(String)
				: [],
		});
	} catch (erro) {
		console.error("Erro ao enviar e-mail SMTP:", erro);
		const mensagemBruta =
			erro instanceof Error ? erro.message : "Falha ao enviar e-mail";
		const mensagem =
			/wrong version number|ESOCKET/i.test(mensagemBruta)
				? "Falha de TLS no SMTP. Use porta 587 com STARTTLS ou 465 com SSL. Verifique host/porta e a opção de conexão segura."
				: mensagemBruta;
		return httpBadRequest(`Falha no envio SMTP: ${mensagem}`);
	}
}
