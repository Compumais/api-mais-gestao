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
export declare function buscarDadosFluxoCaixa({ idempresa, dataInicio, dataFim, }: BuscarDadosFluxoCaixaParams): Promise<FluxoCaixaItem[]>;
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
export declare function buscarDadosContasPagar({ idempresa, dataInicio, dataFim, }: BuscarDadosContasParams): Promise<ContasPagarItem[]>;
export declare function buscarDadosContasReceber({ idempresa, dataInicio, dataFim, }: BuscarDadosContasParams): Promise<ContasReceberItem[]>;
//# sourceMappingURL=relatorios-repositories.d.ts.map