import { api } from "@/lib/axios";

export interface PlanoContas {
	id: string;
	idempresa: string;
	codigo: string | null;
	nome: string | null;
	tipomovimento: string | null;
	inativo: number;
	classe: string | null;
	currenttimemillis: number | null;
	centrocustoobrigatorio: number | null;
	tipoconta: number | null;
	idcontacontabilintegracao: number | null;
	exportaparacontabilidade: number | null;
	idgrupodre: number | null;
	idplanocontas: string | null;
}

export interface ListarPlanoContasResponse {
	data: PlanoContas[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface AtualizarPlanoContasData {
	nome?: string;
	tipomovimento?: string;
	inativo?: 0 | 1;
	classe?: string;
	idgrupodre?: number;
	currenttimemillis?: number;
	centrocustoobrigatorio?: number;
	tipoconta?: number;
	idcontacontabilintegracao?: number;
	exportaparacontabilidade?: number;
	idplanocontas?: string | null;
}

export interface BuscarPlanoContasResponse {
	plano: PlanoContas;
	filhos: PlanoContas[];
}

export interface CriarPlanoContasData {
	idempresa: string;
	nome: string;
	tipomovimento: "E" | "S";
	inativo: 0 | 1;
	classe?: string | null;
	centrocustoobrigatorio?: number | null;
	tipoconta?: number | null;
	exportaparacontabilidade?: number | null;
	idplanocontas?: string;
}

export type FormatoImportacaoPlanoContas = "csv" | "xlsx";

export interface ImportacaoPlanoContasData {
	idempresa: string;
	formato: FormatoImportacaoPlanoContas;
	conteudo: string;
	nomeArquivo?: string;
}

export interface ContaPreviewImportacao {
	linha: number;
	codigo: string;
	nome: string;
	tipomovimento: "E" | "S" | null;
	inativo: number;
	nivel: number;
	codigoPai: string | null;
	erros: string[];
}

export interface VinculoPlanoContas {
	tabela: string;
	quantidade: number;
}

export interface PreviewImportacaoResponse {
	totalContas: number;
	totalErros: number;
	errosGerais: string[];
	contas: ContaPreviewImportacao[];
	vinculos: {
		possui: boolean;
		detalhes: VinculoPlanoContas[];
	};
}

export interface ImportarPlanoContasResponse {
	totalImportadas: number;
	totalRemovidas: number;
}

export interface MoverPlanoContasData {
	id: string;
	idplanocontasdestino: string | null;
}

export const planoContasService = {
	async listar(params?: {
		idempresa?: string;
		idplanocontas?: string;
		inativo?: 0 | 1;
		page?: number;
		limit?: number;
		listarTudo?: boolean;
		tipomovimento?: "E" | "S";
	}): Promise<ListarPlanoContasResponse> {
		const { data } = await api.get<ListarPlanoContasResponse>("/plano-contas", {
			params,
		});
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarPlanoContasData,
	): Promise<PlanoContas> {
		const { data } = await api.put<PlanoContas>(`/plano-contas/${id}`, dados);
		return data;
	},

	async buscar(id: string): Promise<BuscarPlanoContasResponse> {
		const { data } = await api.get<BuscarPlanoContasResponse>(
			`/plano-contas/${id}`,
		);
		return data;
	},

	async criar(dados: CriarPlanoContasData): Promise<PlanoContas> {
		const { data } = await api.post<PlanoContas>("/plano-contas", dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/plano-contas/${id}`);
	},

	async previewImportacao(
		dados: ImportacaoPlanoContasData,
	): Promise<PreviewImportacaoResponse> {
		const { data } = await api.post<PreviewImportacaoResponse>(
			"/plano-contas/importar/preview",
			dados,
		);
		return data;
	},

	async importar(
		dados: ImportacaoPlanoContasData,
		onUploadProgress?: (percentual: number) => void,
	): Promise<ImportarPlanoContasResponse> {
		const { data } = await api.post<ImportarPlanoContasResponse>(
			"/plano-contas/importar",
			dados,
			{
				onUploadProgress: (evento) => {
					if (onUploadProgress && evento.total) {
						onUploadProgress(Math.round((evento.loaded / evento.total) * 100));
					}
				},
			},
		);
		return data;
	},

	async baixarTemplate(formato: FormatoImportacaoPlanoContas): Promise<Blob> {
		const { data } = await api.get<Blob>("/plano-contas/template", {
			params: { formato },
			responseType: "blob",
		});
		return data;
	},

	async mover(dados: MoverPlanoContasData): Promise<PlanoContas> {
		const { data } = await api.put<PlanoContas>("/plano-contas/mover", dados);
		return data;
	},
};
