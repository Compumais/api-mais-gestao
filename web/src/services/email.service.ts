import { api } from "@/lib/axios";

export type ConfiguracaoEmailSmtp = {
	id: string;
	idempresa: string;
	host: string;
	porta: number;
	seguro: boolean;
	usuario: string;
	emailremetente: string;
	nomremetente: string | null;
	ativo: boolean;
	senhaConfigurada: boolean;
	criadoem: string;
	atualizadoem: string;
};

export type SalvarConfiguracaoSmtpData = {
	idempresa: string;
	host: string;
	porta: number;
	seguro: boolean;
	usuario: string;
	senha?: string;
	emailremetente: string;
	nomremetente?: string | null;
	ativo: boolean;
};

export type ResultadoEnvioEmail = {
	messageId?: string;
	aceito: string[];
};

export type EnviarEmailNfeData = {
	idempresa: string;
	destinatario: string;
	enviarXml?: boolean;
	enviarDanfe?: boolean;
	mensagem?: string;
};

export const emailService = {
	async buscarSmtp(idempresa: string): Promise<ConfiguracaoEmailSmtp | null> {
		const { data } = await api.get<ConfiguracaoEmailSmtp | null>(
			"/emails/smtp",
			{ params: { idempresa } },
		);
		return data;
	},

	async salvarSmtp(
		dados: SalvarConfiguracaoSmtpData,
	): Promise<ConfiguracaoEmailSmtp> {
		const { data } = await api.put<ConfiguracaoEmailSmtp>(
			"/emails/smtp",
			dados,
		);
		return data;
	},

	async testarSmtp(dados: {
		idempresa: string;
		destinatario: string;
	}): Promise<ResultadoEnvioEmail> {
		const { data } = await api.post<ResultadoEnvioEmail>(
			"/emails/smtp/testar",
			dados,
		);
		return data;
	},

	async enviarEmailNfe(
		idnotafiscal: string,
		dados: EnviarEmailNfeData,
	): Promise<ResultadoEnvioEmail> {
		const { data } = await api.post<ResultadoEnvioEmail>(
			`/notas-fiscais/${idnotafiscal}/enviar-email`,
			dados,
		);
		return data;
	},
};
