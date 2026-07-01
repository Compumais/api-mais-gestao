import { api } from "@/lib/axios";

export interface FatorConversao {
	id: string;
	idempresa: string;
	nome: string;
	fator: string;
	currenttimemillis: number | null;
}

export interface ListarFatoresConversaoResponse {
	data: FatorConversao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarFatorConversaoData {
	idempresa: string;
	nome: string;
	fator: string;
}

export interface AtualizarFatorConversaoData {
	nome?: string;
	fator?: string;
}

export const fatorConversaoService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		q?: string;
	}): Promise<ListarFatoresConversaoResponse> {
		const { data } = await api.get<ListarFatoresConversaoResponse>(
			"/fatores-conversao",
			{ params },
		);
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		q?: string;
	}): Promise<FatorConversao[]> {
		const limite = 100;
		let pagina = 1;
		const registros: FatorConversao[] = [];

		while (true) {
			const resposta = await fatorConversaoService.listar({
				...params,
				page: pagina,
				limit: limite,
			});

			registros.push(...resposta.data);

			if (pagina >= resposta.paginacao.totalPages) {
				break;
			}

			pagina += 1;
		}

		return registros;
	},

	async buscar(id: string): Promise<FatorConversao> {
		const { data } = await api.get<FatorConversao>(`/fatores-conversao/${id}`);
		return data;
	},

	async criar(dados: CriarFatorConversaoData): Promise<FatorConversao> {
		const { data } = await api.post<FatorConversao>("/fatores-conversao", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarFatorConversaoData,
	): Promise<FatorConversao> {
		const { data } = await api.put<FatorConversao>(
			`/fatores-conversao/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/fatores-conversao/${id}`);
	},
};

export function formatarFatorConversao(valor: string | number): string {
	const numero =
		typeof valor === "number"
			? valor
			: Number.parseFloat(valor.replace(",", "."));

	if (Number.isNaN(numero)) {
		return valor.toString();
	}

	return numero.toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 6,
	});
}

export function fatoresConversaoEquivalentes(
	a?: string | null,
	b?: string | null,
): boolean {
	const numeroA = Number.parseFloat((a ?? "1").replace(",", "."));
	const numeroB = Number.parseFloat((b ?? "1").replace(",", "."));

	if (Number.isNaN(numeroA) || Number.isNaN(numeroB)) {
		return (a ?? "1") === (b ?? "1");
	}

	return Math.abs(numeroA - numeroB) < 0.000001;
}
