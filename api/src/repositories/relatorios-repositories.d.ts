export interface FluxoCaixaItem {
	data: string;
	entradas: number;
	saidas: number;
	saldo: number;
	saldoAcumulado: number;
}
export interface BuscarDadosFluxoCaixaParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
}
export declare function buscarDadosFluxoCaixa(
	params: BuscarDadosFluxoCaixaParams,
): Promise<FluxoCaixaItem[]>;
export interface ContasPagarItem {
	documento: string | null;
	emissao: string | null;
	vencimento: string | null;
	valor: number;
	saldo: number;
	historico: string | null;
	status: string | null;
	emitente: string | null;
}
export interface ContasReceberItem {
	documento: string | null;
	emissao: string | null;
	vencimento: string | null;
	valor: number;
	saldo: number;
	historico: string | null;
	status: string | null;
	emitente: string | null;
}
export interface BuscarDadosContasParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
}
export declare function buscarDadosContasPagar(
	params: BuscarDadosContasParams,
): Promise<ContasPagarItem[]>;
export declare function buscarDadosContasReceber(
	params: BuscarDadosContasParams,
): Promise<ContasReceberItem[]>;

export interface CentroCustosItem {
	codigo: string | null;
	nome: string;
	totalReceitas: number;
	totalDespesas: number;
	saldo: number;
}
export declare function buscarDadosCentroCustos(params: {
	idempresa: string;
}): Promise<CentroCustosItem[]>;

export interface DespesasPorCategoriaItem {
	codigo: string | null;
	nome: string | null;
	total: number;
}
export interface ReceitasPorCategoriaItem {
	codigo: string | null;
	nome: string | null;
	total: number;
}
export interface BuscarPorCategoriaParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
}
export declare function buscarDespesasPorCategoria(
	params: BuscarPorCategoriaParams,
): Promise<DespesasPorCategoriaItem[]>;
export declare function buscarReceitasPorCategoria(
	params: BuscarPorCategoriaParams,
): Promise<ReceitasPorCategoriaItem[]>;

export interface FormasDePagamentoItem {
	formapagamento: string;
	totalReceitas: number;
	totalDespesas: number;
	saldo: number;
}
export declare function buscarFormasDePagamento(
	params: BuscarPorCategoriaParams,
): Promise<FormasDePagamentoItem[]>;

export interface InadimplenciaItem {
	documento: string | null;
	emitente: string | null;
	vencimento: string | null;
	valor: number;
	saldo: number;
	diasAtraso: number;
}
export declare function buscarDadosInadimplencia(
	params: BuscarPorCategoriaParams,
): Promise<InadimplenciaItem[]>;
