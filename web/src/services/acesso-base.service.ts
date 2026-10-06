import { api } from "@/lib/axios";
import type { Empresa } from "@/services/empresas.service";

export interface AcessoBaseResposta {
	token: string;
	usuario: {
		id: string;
		nome: string;
		email: string;
		perfil: string[];
	};
	empresa: Empresa;
}

export const acessoBaseService = {
	async acessar(idempresa: string): Promise<AcessoBaseResposta> {
		const { data } = await api.post<AcessoBaseResposta>("/api/auth/acesso-base", {
			idempresa,
		});
		return data;
	},

	async encerrar(): Promise<{ token: string }> {
		const { data } = await api.post<{ token: string }>(
			"/api/auth/encerrar-acesso-base",
		);
		return data;
	},

	async descartar(): Promise<void> {
		await api.post("/api/auth/descartar-acesso-base");
	},
};
