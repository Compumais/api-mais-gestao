import { api } from "@/lib/axios";

export interface Produto {
	id: string;
	idempresa: string;
	codigo: number | null;
	ean: number | null;
	eantributavel?: string | null;
	referencia: string | null;
	nome: string;
	descricao: string;
	idunidademedida: string | null;
	fornecedor: string | null;
	idgrupo: string | null;
	idgrupogourmet?: string | null;
	espizza?: number | null;
	exportaBalanca?: number | null;
	controlalote?: number | null;
	controlavalidade?: number | null;
	diasValidade?: number | null;
	preco: string | null;
	custoaquisicao?: string | null;
	tipo: string | null;
	iat: string | null;
	ippt: string | null;
	origem: number | null;
	ncm: string | null;
	tipoproduto?: string | null;
	observacoes: string | null;
	inativo: number | null;
	enviamobile?: number | null;
	datacadastro: string;
	quantidadepadrao?: number | null;
	quantidademinima?: number | null;
	quantidademaxima?: number | null;
	idcfopentrada?: string | null;
	idcfopsaida?: string | null;
	idcfopsaidanfce?: string | null;
	idcfopsaidaexterna?: string | null;
	idcest?: string | null;
	cestCodigo?: string | null;
	unidademedida?: string | null;
	idtaxauf?: string | null;
	situacaotributariasnentrada?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	tributacaoespecial?: string | null;
	tributacaosn?: string | null;
	cstpisentrada?: string | number | null;
	cstcofinsentrada?: string | number | null;
	cstpis?: string | number | null;
	cstcofins?: string | number | null;
	cstibs?: string | null;
	classtributariaibs?: string | null;
	cstipientrada?: string | null;
	cstipisaida?: string | null;
	itemrapido?: number | null;
	podeserbrinde?: number | null;
	nomeecf?: string | null;
	decimaispreco?: number | null;
	codigolistalc11603?: string | null;
	codigotributacaonacional?: string | null;
	codigonbs?: string | null;
	cicloposvenda?: number | null;
	idplanocontas?: string | null;
	comissao?: string | null;
	comissaoavista?: string | null;
	comissaoprazo?: string | null;
	percentualcomissaoquitacao?: string | null;
	situacaoiss?: string | null;
	aliquotaiss?: string | null;
	exigibilidadeiss?: string | null;
	processoisencaoiss?: string | null;
	incentivofiscal?: number | null;
	codigomunicipalservico?: string | null;
	tipoimpressaogourmet?: string | null;
	aliquotapis?: string | null;
	aliquotacofins?: string | null;
	percentualmva?: string | null;
	aliquotaicmsinterna?: string | null;
	aliquotaicmsdiferencialentrada?: string | null;
	aliquotareducaoicmsnfcesat?: string | null;
	aliquotafcpnf?: string | null;
	ultimaaliquotaicmsst?: string | null;
	ultimaaliquotafcpst?: string | null;
	aliquotapisentrada?: string | null;
	aliquotaconfinsentrada?: string | null;
	aliquotapisconfinsentradapreco?: string | null;
	aliquotapisconfinssaidapreco?: string | null;
	aliquotaiibs?: string | null;
	aliquotacbs?: string | null;
}

export interface ListarProdutosResponse {
	data: Produto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

type CamposServicoProduto = {
	itemrapido?: number | null;
	podeserbrinde?: number | null;
	inativo?: number | null;
	nomeecf?: string | null;
	decimaispreco?: number | null;
	codigolistalc11603?: string | null;
	codigotributacaonacional?: string | null;
	codigonbs?: string | null;
	cicloposvenda?: number | null;
	idplanocontas?: string | null;
	comissao?: string | null;
	comissaoavista?: string | null;
	comissaoprazo?: string | null;
	percentualcomissaoquitacao?: string | null;
	situacaoiss?: string | null;
	aliquotaiss?: string | null;
	exigibilidadeiss?: string | null;
	processoisencaoiss?: string | null;
	incentivofiscal?: number | null;
	codigomunicipalservico?: string | null;
	tipoimpressaogourmet?: string | null;
	idcfopsaidaexterna?: string | null;
	aliquotapis?: string | null;
	aliquotacofins?: string | null;
};

type CamposAliquotaProduto = {
	percentualmva?: string | null;
	aliquotaicmsinterna?: string | null;
	aliquotaicmsdiferencialentrada?: string | null;
	aliquotareducaoicmsnfcesat?: string | null;
	aliquotafcpnf?: string | null;
	ultimaaliquotaicmsst?: string | null;
	ultimaaliquotafcpst?: string | null;
	aliquotapisentrada?: string | null;
	aliquotaconfinsentrada?: string | null;
	aliquotapisconfinsentradapreco?: string | null;
	aliquotapisconfinssaidapreco?: string | null;
	aliquotaiibs?: string | null;
	aliquotacbs?: string | null;
};

export interface CriarProdutoData
	extends CamposServicoProduto,
		CamposAliquotaProduto {
	idempresa: string;
	codigo: number;
	ean?: number | null;
	referencia?: string | null;
	nome: string;
	idunidademedida: string;
	fornecedor?: string | null;
	idgrupo?: string | null;
	idgrupogourmet?: string | null;
	espizza?: number | null;
	exportaBalanca?: number | null;
	controlalote?: number | null;
	controlavalidade?: number | null;
	diasValidade?: number | null;
	preco: string;
	custoaquisicao?: string | null;
	tipo?: string;
	iat?: string | null;
	ippt?: string | null;
	origem?: number | null;
	ncm?: string | null;
	tipoproduto?: string | null;
	observacoes?: string | null;
	enviamobile?: number | null;
	quantidadepadrao?: number | null;
	quantidademinima?: number | null;
	quantidademaxima?: number | null;
	idcfopentrada?: string | null;
	idcfopsaida?: string | null;
	idcfopsaidanfce?: string | null;
	idcest?: string | null;
	idtaxauf?: string | null;
	situacaotributariasnentrada?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	tributacaoespecial?: string | null;
	tributacaosn?: string | null;
	cstpisentrada?: string | null;
	cstcofinsentrada?: string | null;
	cstpis?: string | null;
	cstcofins?: string | null;
	cstipientrada?: string | null;
	cstipisaida?: string | null;
	cstibs?: string | null;
	classtributariaibs?: string | null;
}

export interface TributacaoPorCfopResponse {
	idcfopsaida?: string | null;
	idcfopsaidanfce?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	tributacaoespecial?: string | null;
	tributacaosn?: string | null;
	cfopvendaecf?: number | null;
}

export type FormatoImportacaoProdutos = "csv" | "xlsx";

export interface ImportacaoProdutosData {
	idempresa: string;
	formato: FormatoImportacaoProdutos;
	conteudo: string;
	nomeArquivo?: string;
}

export interface ProdutoPreviewImportacao {
	linha: number;
	codigo: number | null;
	nome: string;
	grupo: string;
	unidade: string;
	preco: string | null;
	acao: "criar" | "atualizar";
	erros: string[];
}

export interface PreviewImportacaoProdutosResponse {
	totalProdutos: number;
	totalCriar: number;
	totalAtualizar: number;
	totalErros: number;
	errosGerais: string[];
	produtos: ProdutoPreviewImportacao[];
}

export interface ImportarProdutosResponse {
	totalImportados: number;
	totalCriados: number;
	totalAtualizados: number;
}

export interface AlterarProdutosEmMassaData {
	idempresa: string;
	ids: string[];
	campos: AtualizarProdutoData;
}

export interface AlterarProdutosEmMassaResponse {
	atualizados: number;
	erros: number;
}

export interface AtualizarProdutoData
	extends CamposServicoProduto,
		CamposAliquotaProduto {
	codigo?: number;
	ean?: number | null;
	referencia?: string | null;
	nome?: string;
	idunidademedida?: string;
	fornecedor?: string | null;
	idgrupo?: string | null;
	idgrupogourmet?: string | null;
	espizza?: number | null;
	exportaBalanca?: number | null;
	controlalote?: number | null;
	controlavalidade?: number | null;
	diasValidade?: number | null;
	preco?: string;
	custoaquisicao?: string | null;
	tipo?: string;
	iat?: string | null;
	ippt?: string | null;
	origem?: number | null;
	ncm?: string | null;
	tipoproduto?: string | null;
	observacoes?: string | null;
	enviamobile?: number | null;
	quantidadepadrao?: number | null;
	quantidademinima?: number | null;
	quantidademaxima?: number | null;
	idcfopentrada?: string | null;
	idcfopsaida?: string | null;
	idcfopsaidanfce?: string | null;
	idcest?: string | null;
	idtaxauf?: string | null;
	situacaotributariasnentrada?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	tributacaoespecial?: string | null;
	tributacaosn?: string | null;
	cstpisentrada?: string | null;
	cstcofinsentrada?: string | null;
	cstpis?: string | null;
	cstcofins?: string | null;
	cstipientrada?: string | null;
	cstipisaida?: string | null;
	cstibs?: string | null;
	classtributariaibs?: string | null;
}

export const produtosService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
		q?: string;
		inativo?: number;
		tipo?: "P" | "S";
	}): Promise<ListarProdutosResponse> {
		const { data } = await api.get<ListarProdutosResponse>("/produtos", {
			params,
		});
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		nome?: string;
		q?: string;
		inativo?: number;
		tipo?: "P" | "S";
	}): Promise<Produto[]> {
		const limite = 100;
		let pagina = 1;
		const registros: Produto[] = [];

		while (true) {
			const resposta = await produtosService.listar({
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

	async buscar(id: string): Promise<Produto> {
		const { data } = await api.get<Produto>(`/produtos/${id}`);
		return data;
	},

	async criar(dados: CriarProdutoData): Promise<Produto> {
		const { data } = await api.post<Produto>("/produtos", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarProdutoData,
		idempresa: string,
	): Promise<Produto> {
		const { data } = await api.put<Produto>(`/produtos/${id}`, dados, {
			params: { idempresa },
		});
		return data;
	},

	async alterarEmMassa(
		dados: AlterarProdutosEmMassaData,
	): Promise<AlterarProdutosEmMassaResponse> {
		const { data } = await api.post<AlterarProdutosEmMassaResponse>(
			"/produtos/alterar-em-massa",
			dados,
		);
		return data;
	},

	async inativar(
		id: string,
		inativo: number,
		idempresa: string,
	): Promise<Produto> {
		const { data } = await api.patch<Produto>(`/produtos/inativar/${id}`, {
			inativo,
			idempresa,
		});
		return data;
	},

	async deletar(id: string, idempresa: string): Promise<void> {
		await api.delete(`/produtos/${id}`, {
			params: { idempresa },
		});
	},

	async buscarProximoCodigo(idempresa: string): Promise<{ codigo: number }> {
		const { data } = await api.get<{ codigo: number }>(
			"/produtos/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},

	async tributacaoPorCfop(
		idempresa: string,
		idcfop: string,
	): Promise<TributacaoPorCfopResponse> {
		const { data } = await api.get<TributacaoPorCfopResponse>(
			"/produtos/tributacao-por-cfop",
			{ params: { idempresa, idcfop } },
		);
		return data;
	},

	async previewImportacao(
		dados: ImportacaoProdutosData,
	): Promise<PreviewImportacaoProdutosResponse> {
		const { data } = await api.post<PreviewImportacaoProdutosResponse>(
			"/produtos/importar/preview",
			dados,
		);
		return data;
	},

	async importar(
		dados: ImportacaoProdutosData,
		onUploadProgress?: (percentual: number) => void,
	): Promise<ImportarProdutosResponse> {
		const { data } = await api.post<ImportarProdutosResponse>(
			"/produtos/importar",
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

	async baixarTemplate(formato: FormatoImportacaoProdutos): Promise<Blob> {
		const { data } = await api.get<Blob>("/produtos/template", {
			params: { formato },
			responseType: "blob",
		});
		return data;
	},
};
