import { api } from "@/lib/axios";

export interface IntegracoesUsuario {
	geminiApiKey?: string;
	openaiApiKey?: string;
	openrouterApiKey?: string;
	asaasToken?: string;
	provedorPreferido?: "auto" | "openai" | "gemini" | "openrouter";
	modeloOpenai?: string;
	modeloGemini?: string;
	modeloOpenrouter?: string;
}

export interface ConfiguracaoUsuario {
	id: string;
	idusuario: string;
	integracoes: IntegracoesUsuario;
	criadoem: string;
	atualizadoem: string;
}

export type LayoutMenuUsuario = "sidebar" | "topbar";

export type PreferenciasUiUsuario = {
	colunasTabelas?: Record<string, Record<string, boolean>>;
	layoutMenu?: LayoutMenuUsuario;
};

export const configuracaoUsuarioService = {
	async buscar(idempresa?: string): Promise<ConfiguracaoUsuario | null> {
		const params = idempresa ? { idempresa } : {};
		const { data } = await api.get<ConfiguracaoUsuario | null>(
			"/configuracoes-usuario",
			{ params },
		);
		return data;
	},

	async atualizar(dados: IntegracoesUsuario): Promise<ConfiguracaoUsuario> {
		const { data } = await api.put<ConfiguracaoUsuario>(
			"/configuracoes-usuario",
			dados,
		);
		return data;
	},

	async buscarPreferenciasUi(): Promise<PreferenciasUiUsuario> {
		const { data } = await api.get<PreferenciasUiUsuario>(
			"/configuracoes-usuario/preferencias-ui",
		);
		return data ?? { colunasTabelas: {} };
	},

	async atualizarPreferenciasUi(
		dados: PreferenciasUiUsuario,
	): Promise<PreferenciasUiUsuario> {
		const { data } = await api.put<PreferenciasUiUsuario>(
			"/configuracoes-usuario/preferencias-ui",
			dados,
		);
		return data;
	},
};
