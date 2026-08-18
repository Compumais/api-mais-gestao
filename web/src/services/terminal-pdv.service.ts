import { api } from "@/lib/axios";
import type { TerminalPdvFormData } from "@/schemas/terminal-pdv.schema";

export interface TerminalPdv {
	id: string;
	idempresa: string;
	numeropdv: number;
	descricao: string | null;
	idnfeserie: string;
	ativo: boolean;
	serie: string;
	numeroproximo: number;
	modeloserie: string;
	serieativa: boolean;
	ultimonumero?: number | null;
}

export const terminalPdvService = {
	async listar(idempresa: string): Promise<TerminalPdv[]> {
		const { data } = await api.get<{ data: TerminalPdv[] }>("/terminais-pdv", {
			params: { idempresa },
		});
		return data.data;
	},

	async criar(
		dados: TerminalPdvFormData & { idempresa: string },
	): Promise<TerminalPdv> {
		const { data } = await api.post<TerminalPdv>("/terminais-pdv", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: Partial<TerminalPdvFormData> & { idempresa: string },
	): Promise<TerminalPdv> {
		const { data } = await api.put<TerminalPdv>(`/terminais-pdv/${id}`, dados);
		return data;
	},

	async excluir(id: string, idempresa: string): Promise<void> {
		await api.delete(`/terminais-pdv/${id}`, {
			params: { idempresa },
		});
	},
};
