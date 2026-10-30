import { api } from "@/lib/axios";

export interface BancoImagemGrupo {
	id: string;
	nome: string;
	ordem: number;
	ativo: boolean;
	referencia: string | null;
	temImagem: boolean;
}

export interface BancoImagemCodigo {
	id: string;
	codigo: string;
}

export interface BancoImagemProduto {
	id: string;
	idgrupo: string;
	grupo: string;
	nome: string;
	ativo: boolean;
	referencia: string | null;
	temImagem: boolean;
	codigos: BancoImagemCodigo[];
}

function versao(referencia?: string | null): string | null {
	if (!referencia) return null;
	try {
		return new URL(referencia, "http://local").searchParams.get("v");
	} catch {
		return null;
	}
}

export const bancoImagemService = {
	versao,

	async listarGrupos(): Promise<BancoImagemGrupo[]> {
		const { data } = await api.get<BancoImagemGrupo[]>("/banco-imagens/grupos");
		return data;
	},

	async criarGrupo(dados: {
		nome: string;
		ativo?: boolean;
	}): Promise<BancoImagemGrupo> {
		const { data } = await api.post<BancoImagemGrupo>(
			"/banco-imagens/grupos",
			dados,
		);
		return data;
	},

	async atualizarGrupo(
		id: string,
		dados: { nome?: string; ativo?: boolean },
	): Promise<BancoImagemGrupo> {
		const { data } = await api.put<BancoImagemGrupo>(
			`/banco-imagens/grupos/${id}`,
			dados,
		);
		return data;
	},

	async excluirGrupo(id: string): Promise<void> {
		await api.delete(`/banco-imagens/grupos/${id}`);
	},

	async enviarImagemGrupo(id: string, arquivo: File): Promise<BancoImagemGrupo> {
		const { data } = await api.put<BancoImagemGrupo>(
			`/banco-imagens/grupos/${id}/imagem`,
			arquivo,
			{
				headers: {
					"Content-Type": arquivo.type,
					"X-File-Name": encodeURIComponent(arquivo.name),
				},
			},
		);
		return data;
	},

	async removerImagemGrupo(id: string): Promise<BancoImagemGrupo> {
		const { data } = await api.delete<BancoImagemGrupo>(
			`/banco-imagens/grupos/${id}/imagem`,
		);
		return data;
	},

	async baixarImagemGrupo(id: string, token?: string | null): Promise<Blob> {
		const { data } = await api.get<Blob>(
			`/banco-imagens/grupos/${id}/imagem`,
			{
				params: token ? { v: token } : undefined,
				responseType: "blob",
			},
		);
		return data;
	},

	async listarProdutos(idgrupo: string): Promise<BancoImagemProduto[]> {
		const { data } = await api.get<BancoImagemProduto[]>(
			"/banco-imagens/produtos",
			{ params: { idgrupo } },
		);
		return data;
	},

	async buscarProduto(id: string): Promise<BancoImagemProduto> {
		const { data } = await api.get<BancoImagemProduto>(
			`/banco-imagens/produtos/${id}`,
		);
		return data;
	},

	async criarProduto(dados: {
		idgrupo: string;
		nome: string;
		codigos: string[];
		ativo?: boolean;
	}): Promise<BancoImagemProduto> {
		const { data } = await api.post<BancoImagemProduto>(
			"/banco-imagens/produtos",
			dados,
		);
		return data;
	},

	async atualizarProduto(
		id: string,
		dados: {
			nome?: string;
			idgrupo?: string;
			codigos?: string[];
			ativo?: boolean;
		},
	): Promise<BancoImagemProduto> {
		const { data } = await api.put<BancoImagemProduto>(
			`/banco-imagens/produtos/${id}`,
			dados,
		);
		return data;
	},

	async excluirProduto(id: string): Promise<void> {
		await api.delete(`/banco-imagens/produtos/${id}`);
	},

	async enviarImagemProduto(
		id: string,
		arquivo: File,
	): Promise<BancoImagemProduto> {
		const { data } = await api.put<BancoImagemProduto>(
			`/banco-imagens/produtos/${id}/imagem`,
			arquivo,
			{
				headers: {
					"Content-Type": arquivo.type,
					"X-File-Name": encodeURIComponent(arquivo.name),
				},
			},
		);
		return data;
	},

	async removerImagemProduto(id: string): Promise<BancoImagemProduto> {
		const { data } = await api.delete<BancoImagemProduto>(
			`/banco-imagens/produtos/${id}/imagem`,
		);
		return data;
	},

	async baixarImagem(id: string, token?: string | null): Promise<Blob> {
		const { data } = await api.get<Blob>(`/banco-imagens/${id}/imagem`, {
			params: token ? { v: token } : undefined,
			responseType: "blob",
		});
		return data;
	},

	async buscar(params: {
		q?: string;
		codigo?: string;
		idgrupo?: string;
		limit?: number;
	}): Promise<BancoImagemProduto[]> {
		const { data } = await api.get<BancoImagemProduto[]>(
			"/banco-imagens/busca",
			{ params },
		);
		return data;
	},
};
