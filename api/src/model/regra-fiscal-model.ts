export type StatusRegraFiscal =
	| "rascunho"
	| "pendente_revisao"
	| "validado"
	| "incompativel"
	| "desativado";

export type EscopoRegraFiscal = "estrutural" | "operacao";

export type CondicoesRegraFiscal = {
	escopo?: EscopoRegraFiscal;
	tipo?: string;
	uf_emitente?: string;
	uf_destinatario?: string;
	ncm?: string;
	cest?: string;
	crt?: number;
	regime_tributario?: "SN" | "NORMAL";
	cfop?: string;
	cfop_prefixo?: string;
	consumidor_final?: boolean;
	contribuinte_icms?: boolean;
};

export type ResultadoRegraFiscal = {
	cfop?: string;
	csosn?: string;
	cst?: string;
	st_aplicavel?: boolean | null;
	fcp_aplicavel?: boolean | null;
	difal_aplicavel?: boolean | null;
};

export type FonteRegraFiscal = {
	tipo?: string;
	numero?: string;
	url?: string;
	orgao?: string;
	vigencia_inicio?: string;
};

export type FontesRegraFiscal = FonteRegraFiscal[];

export type NivelConfiancaFiscal =
	| "CONFIRMADA"
	| "PROVAVEL"
	| "INDETERMINADA"
	| "CONFLITANTE";

export type StatusValidacaoFiscal =
	| "VALIDO"
	| "ATENCAO"
	| "INCONSISTENCIA"
	| "REGRA_NAO_CONFIRMADA";

export type ClassificacaoFinalFiscal =
	| "VALIDADO"
	| "VALIDADO_COM_ALERTAS"
	| "REGRA_FISCAL_NAO_CONFIRMADA"
	| "ERRO_DE_CONFIGURACAO"
	| "BUG_DE_SISTEMA"
	| "ALTERACAO_LEGISLATIVA_DETECTADA"
	| "REVISAO_FISCAL_NECESSARIA";

export type TipoInconsistenciaFiscal =
	| "BUG_DE_SISTEMA"
	| "ERRO_DE_CADASTRO"
	| "ERRO_DE_PARAMETRIZACAO_FISCAL"
	| "REGRA_FISCAL_INDETERMINADA"
	| "ALTERACAO_LEGISLATIVA";

export type TipoOperacaoFiscal =
	| "venda"
	| "devolucao"
	| "transferencia"
	| "bonificacao"
	| "remessa"
	| "industrializacao"
	| "outra";

export type ValidacaoFiscalItem = {
	status: StatusValidacaoFiscal;
	code: string;
	field?: string;
	expected?: number | string;
	actual?: number | string;
	message: string;
	tipoInconsistencia?: TipoInconsistenciaFiscal;
};

export type RelatorioAuditoriaFiscal = {
	operacao_id: string;
	classificacao_final: ClassificacaoFinalFiscal;
	permitir_transmissao: boolean;
	operacao: {
		interna_interestadual: "interna" | "interestadual" | "exterior";
		tipo: TipoOperacaoFiscal;
		consumidor_final: boolean;
		contribuinte_icms: boolean;
		possibilidade_st: boolean;
		possibilidade_difal: boolean;
		possibilidade_fcp: boolean;
	};
	decisao: {
		cfop: string | null;
		csosn: string | null;
		cst: string | null;
		st: NivelConfiancaFiscal | "NAO_APLICAVEL";
		difal: NivelConfiancaFiscal | "NAO_APLICAVEL";
		fcp: NivelConfiancaFiscal | "NAO_APLICAVEL";
	};
	nivel_confianca: NivelConfiancaFiscal;
	fontes: Array<{
		orgao?: string;
		documento?: string;
		url?: string;
		vigencia?: string;
	}>;
	regras_aplicadas: string[];
	validacoes: ValidacaoFiscalItem[];
	inconsistencias: Array<{
		tipo: TipoInconsistenciaFiscal;
		code: string;
	}>;
};
