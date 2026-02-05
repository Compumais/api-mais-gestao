import { api } from "@/lib/axios";

export interface Financeiro {
	id: string;
	idempresa: string;
	identidade: string | null;
	tipo: string | null; // P ou R
	tipoorigem: number | null;
	idorigem: number | null;
	parcela: number | null;
	documento: string | null;
	idtipodocumentofinanceiro: number | null;
	status: string | null;
	emissao: string | null;
	vencimento: string | null;
	vencimentooriginal: string | null;
	pagamento: string | null;
	baixa: string | null;
	valor: string;
	saldo: string;
	historico: string | null;
	idbanco: number | null;
	agencia: string | null;
	numerocontacorrente: string | null;
	cnpjcpfemitente: string | null;
	emitente: string | null;
	identidadedestino: number | null;
	idcodigocontabil: number | null;
	juros: number;
	multa: number;
	taxafinanciamento: number;
	evento: number | null;
	devolucaocodigo: number | null;
	devolucaodescricao: string | null;
	devolucaodata: string | null;
	protestodate: string | null;
	nossonumero: string | null;
	idcontageraboleto: number | null;
	numerocheque: string | null;
	remessagerada: number | null;
	boletoimpresso: number | null;
	idtipocobranca: number | null;
	idrepresentante: number | null;
	percentualcomissaofaturamento: string | null;
	percentualcomissaoquitacao: string | null;
	currenttimemillis: number | null;
	vencimentocalculoencargos: string | null;
	valorbasecomissao: string | null;
	valorpagorecebido: string | null;
	codigobarras: string | null;
	codigodigitado: string | null;
	nomebandeira: string | null;
	valororiginalcomissao: string | null;
	saldocomissao: string | null;
	entrada: string | null;
	registro: string | null;
	baixa2: string | null;
	idportador: number | null;
	idcarteirageradauboleto: number | null;
	tiporateiocentrocusto: number | null;
	nomeadministradora: string | null;
	iddependente: number | null;
	dvnossonumero: string | null;
	idadministradora: number | null;
	idbandeira: number | null;
	ultimaocorrenciabancaria: string | null;
	idusuariosupervisor: string | null;
	dataliberacaousuariosupervisor: string | null;
	acaoprocessamentoretorno: string | null;
	instrucaocobrancaboleto: number | null;
	diasinstrucaocobrancaboleto: number | null;
	observacaoboleto: string | null;
	idrepresentante2: number | null;
	percentualcomissaoquitacao2: string | null;
	valororiginalcomissao2: string | null;
	saldocomissao2: string | null;
	statusjob: number | null;
	extra1: string | null;
	extra2: string | null;
	extra3: string | null;
	extra4: string | null;
	extra5: string | null;
	extra6: string | null;
	datareferencia: string | null;
	urlqrcode: string | null;
	tipointegracao: number | null;
	referenciaparceiro: string | null;
	jsonretornodocumento: string | null;
	totalparcelas: number | null;
	urldocumento: string | null;
	codigoecommerce: string | null;
	codigopedidoecommerce: string | null;
	idconfiguracaoecommerce: number | null;
	idpagamentoapi: string | null;
	autenticacaopagamentoapi: string | null;
	statuscobrancaonline: number | null;
	extra7: string | null;
	extra8: string | null;
	extra9: string | null;
	extra10: string | null;
	extra11: string | null;
	extra12: string | null;
	extra13: string | null;
	extra14: string | null;
	extra15: string | null;
	extra16: string | null;
}

export interface ListarFinanceirosResponse {
	data: Financeiro[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ListarFinanceirosParams {
	page?: number;
	limit?: number;
	saldo?: string | null;
	emissao?: string | null;
	tipo?: string | null; // P ou R
}

export const financeiroService = {
	async listar(
		params?: ListarFinanceirosParams,
	): Promise<ListarFinanceirosResponse> {
		const { data } = await api.get<ListarFinanceirosResponse>("/financeiro", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<Financeiro> {
		const { data } = await api.get<Financeiro>(`/financeiro/${id}`);
		return data;
	},
};
