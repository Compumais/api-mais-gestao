import { api } from "@/lib/axios";

export interface IntegracoesUsuario {
	geminiApiKey?: string;
	openaiApiKey?: string;
	openrouterApiKey?: string;
	asaasToken?: string;
}

export interface ConfiguracaoUsuario {
	id: string;
	idusuario: string;
	integracoes: IntegracoesUsuario;
	criadoem: string;
	atualizadoem: string;
}

export const configuracaoUsuarioService = {
	async buscar(idempresa?: string): Promise<ConfiguracaoUsuario | null> {
		const params = idempresa ? { idempresa } : {};
		const { data } = await api.get<ConfiguracaoUsuario | null>(
			"/configuracoes-usuario",
			{ params },
		);
		return data;
	},

	async atualizar(
		dados: IntegracoesUsuario,
	): Promise<ConfiguracaoUsuario> {
		const { data } = await api.put<ConfiguracaoUsuario>(
			"/configuracoes-usuario",
			dados,
		);
		return data;
	},
};

