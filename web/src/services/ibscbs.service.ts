import { api } from "@/lib/axios";

export type CstIbsCbs = {
	cst: string;
	label: string;
	grupoibscbs: number;
	grupoibsmonofasico: number;
	gruporeducaoaliquota: number;
};

export type ClassificacaoIbsCbs = {
	cst: string;
	codigo: string;
	nome: string;
	descricao: string;
	nfe: boolean;
	nfce: boolean;
	tipoaliquota: number;
	percentualreducaoibs: number;
	percentualreducaocbs: number;
	aliquotaiibs: string;
	aliquotacbs: string;
};

export const ibsCbsService = {
	async listarCst(): Promise<CstIbsCbs[]> {
		const { data } = await api.get<{ data: CstIbsCbs[] }>("/ibscbs/cst");
		return data.data ?? [];
	},

	async listarClassificacoes(params?: {
		cst?: string | null;
		documento?: "nfe" | "nfce" | "todos";
	}): Promise<ClassificacaoIbsCbs[]> {
		const { data } = await api.get<{ data: ClassificacaoIbsCbs[] }>(
			"/ibscbs/classificacoes",
			{
				params: {
					...(params?.cst ? { cst: params.cst } : {}),
					documento: params?.documento ?? "nfe",
				},
			},
		);
		return data.data ?? [];
	},
};
