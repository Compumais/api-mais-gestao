import { api } from "@/lib/axios";

export type Equipamento = {
	id: string;
	idempresa: string;
	codigo: string;
	descricao: string;
	numeroserie: string | null;
	situacao: string;
	precodiaria: string;
	precosemanal: string;
	precoquinzenal: string;
	precomensal: string;
	observacao: string | null;
};

export type EquipamentoPayload = {
	idempresa: string;
	codigo?: string;
	descricao: string;
	numeroserie?: string | null;
	situacao?: "disponivel" | "inativo" | "alocado";
	precodiaria: number;
	precosemanal: number;
	precoquinzenal: number;
	precomensal: number;
	observacao?: string | null;
};

export const equipamentoService = {
	async buscarProximoCodigo(idempresa: string) {
		const { data } = await api.get<{ codigo: string }>(
			"/equipamentos/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},

	async listar(params: {
		idempresa: string;
		descricao?: string;
		codigo?: string;
		situacao?: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: Equipamento[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/equipamentos", { params });
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		situacao?: string;
		descricao?: string;
	}) {
		const limite = 100;
		let pagina = 1;
		const registros: Equipamento[] = [];
		while (true) {
			const resposta = await equipamentoService.listar({
				...params,
				page: pagina,
				limit: limite,
			});
			registros.push(...resposta.data);
			if (pagina >= resposta.paginacao.totalPages) break;
			pagina += 1;
		}
		return registros;
	},

	async buscar(id: string, idempresa: string) {
		const { data } = await api.get<Equipamento>(`/equipamentos/${id}`, {
			params: { idempresa },
		});
		return data;
	},

	async criar(dados: EquipamentoPayload) {
		const { data } = await api.post<Equipamento>("/equipamentos", dados);
		return data;
	},

	async atualizar(id: string, dados: EquipamentoPayload) {
		const { data } = await api.put<Equipamento>(`/equipamentos/${id}`, dados);
		return data;
	},

	async excluir(id: string, idempresa: string) {
		await api.delete(`/equipamentos/${id}`, { params: { idempresa } });
	},
};
