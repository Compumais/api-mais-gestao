import { api } from "@/lib/axios";

export type BiTipoGrafico =
	| "kpi"
	| "barra"
	| "linha"
	| "area"
	| "pizza"
	| "tabela";

export type BiFormatoValor = "moeda" | "numero" | "percentual";
export type BiColSpan = 4 | 6 | 8 | 12;

export interface BiSerieConfig {
	coluna: string;
	label?: string;
	cor?: string;
}

export interface BiMapeamentoGrafico {
	eixoX?: string;
	series?: BiSerieConfig[];
	colunaValor?: string;
	formato?: BiFormatoValor;
}

export interface BiColunaSchema {
	nome: string;
	tipo: string;
}

export interface BiViewSchema {
	nome: string;
	colunas: BiColunaSchema[];
}

export interface BiCatalogoItem {
	codigo: string;
	categoria: "Vendas" | "Financeiro" | "Estoque" | "Fiscal";
	titulo: string;
	descricao: string;
	sql: string;
	tipoGrafico: BiTipoGrafico;
	mapeamento: BiMapeamentoGrafico;
	larguraPadrao: BiColSpan;
}

export interface BiConsulta {
	id: string;
	idempresa: string;
	nome: string;
	descricao: string | null;
	sql: string;
	parametros: Array<{ nome: string; tipo?: string; padrao?: string }>;
	origem: string;
	criadoem: string;
	atualizadoem: string;
}

export interface BiWidget {
	id: string;
	idempresa: string;
	idconsulta: string;
	titulo: string;
	subtitulo: string | null;
	tipografico: BiTipoGrafico;
	mapeamento: BiMapeamentoGrafico;
	cachettlsegundos: number;
	codigocatalogo: string | null;
	criadoem: string;
	atualizadoem: string;
	consulta?: BiConsulta;
}

export interface BiLayoutItemComWidget {
	widgetId: string;
	ordem: number;
	colSpan: BiColSpan;
	widget: BiWidget;
}

export interface BiDashboardPersonalizado {
	nome: string;
	itens: BiLayoutItemComWidget[];
	limiteWidgets: number;
}

export interface BiResultadoExecucao {
	colunas: string[];
	linhas: Record<string, unknown>[];
	totalRetornado: number;
	truncado: boolean;
	duracaoMs: number;
	parametrosDetectados?: string[];
	doCache?: boolean;
}

export const editorSqlService = {
	async obterSchema(): Promise<{ views: BiViewSchema[] }> {
		const { data } = await api.get("/editor-sql/schema");
		return data;
	},

	async listarCatalogo(): Promise<{ catalogo: BiCatalogoItem[] }> {
		const { data } = await api.get("/editor-sql/catalogo");
		return data;
	},

	async executarSql(payload: {
		sql: string;
		parametros?: Record<string, unknown>;
		limiteLinhas?: number;
	}): Promise<BiResultadoExecucao> {
		const { data } = await api.post("/editor-sql/executar", payload);
		return data;
	},

	async listarConsultas(): Promise<{ consultas: BiConsulta[] }> {
		const { data } = await api.get("/editor-sql/consultas");
		return data;
	},

	async criarConsulta(payload: {
		nome: string;
		descricao?: string | null;
		sql: string;
	}): Promise<{ consulta: BiConsulta }> {
		const { data } = await api.post("/editor-sql/consultas", payload);
		return data;
	},

	async atualizarConsulta(
		id: string,
		payload: { nome?: string; descricao?: string | null; sql?: string },
	): Promise<{ consulta: BiConsulta }> {
		const { data } = await api.put(`/editor-sql/consultas/${id}`, payload);
		return data;
	},

	async excluirConsulta(id: string): Promise<{ excluida: boolean }> {
		const { data } = await api.delete(`/editor-sql/consultas/${id}`);
		return data;
	},

	async criarWidget(payload: {
		idconsulta?: string;
		sql?: string;
		nomeConsulta?: string;
		titulo: string;
		subtitulo?: string | null;
		tipografico: BiTipoGrafico;
		mapeamento: BiMapeamentoGrafico;
		cachettlsegundos?: number;
		adicionarAoDashboard?: boolean;
		colSpan?: BiColSpan;
	}): Promise<{ widget: BiWidget }> {
		const { data } = await api.post("/editor-sql/widgets", payload);
		return data;
	},

	async instalarDoCatalogo(codigo: string): Promise<{ widget: BiWidget }> {
		const { data } = await api.post(`/editor-sql/widgets/catalogo/${codigo}`);
		return data;
	},

	async excluirWidget(id: string): Promise<{ excluido: boolean }> {
		const { data } = await api.delete(`/editor-sql/widgets/${id}`);
		return data;
	},

	async executarWidget(
		widgetId: string,
		payload?: {
			parametros?: Record<string, unknown>;
			forcarAtualizacao?: boolean;
		},
	): Promise<BiResultadoExecucao> {
		const { data } = await api.post(
			`/editor-sql/widgets/${widgetId}/executar`,
			payload ?? {},
		);
		return data;
	},

	async obterDashboardLayout(): Promise<BiDashboardPersonalizado> {
		const { data } = await api.get("/editor-sql/dashboard-layout");
		return data;
	},

	async salvarDashboardLayout(payload: {
		nome?: string;
		itens: Array<{ widgetId: string; ordem: number; colSpan: BiColSpan }>;
	}) {
		const { data } = await api.put("/editor-sql/dashboard-layout", payload);
		return data;
	},
};
