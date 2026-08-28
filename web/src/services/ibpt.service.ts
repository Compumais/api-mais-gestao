import { api } from "@/lib/axios";

export type StatusTabelaIbpt = {
	uf: string;
	importado: boolean;
	chave?: string;
	fonte?: string;
	versao?: string;
	quantidadeRegistros: number;
	importadoEm?: string;
};

export type ResultadoImportacaoIbpt = {
	uf: string;
	chave: string;
	fonte: string;
	versao?: string;
	quantidadeRegistros: number;
};

export const ibptService = {
	async status(idempresa: string, uf: string): Promise<StatusTabelaIbpt> {
		const { data } = await api.get<StatusTabelaIbpt>(
			`/empresas/${idempresa}/ibpt/status`,
			{ params: { uf } },
		);
		return data;
	},

	async importar(
		idempresa: string,
		conteudo: string,
		uf?: string,
	): Promise<ResultadoImportacaoIbpt> {
		const { data } = await api.post<ResultadoImportacaoIbpt>(
			`/empresas/${idempresa}/ibpt/importar`,
			{ conteudo, uf },
		);
		return data;
	},
};
