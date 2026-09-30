export const ACOES_CONCILIACAO_NFCE = [
	"AUTO_RECUPERAR",
	"AUTO_CORRIGIR",
	"CONSULTAR",
	"AGUARDAR",
	"BLOQUEAR",
	"EXIGIR_INTERVENCAO",
] as const;

export type AcaoConciliacaoNfce = (typeof ACOES_CONCILIACAO_NFCE)[number];

export type SituacaoOperacionalNfce =
	| "autorizada"
	| "recuperada"
	| "rejeitada"
	| "pendente_consulta"
	| "conflito"
	| "transmitindo"
	| "recuperando";

export type ProximaAcaoEmissaoNfce =
	| "retornar_autorizada"
	| "conciliar"
	| "transmitir_mesma_identidade"
	| "bloquear"
	| "nova_numeracao_comprovada";

export type ClasseResultadoTransmissaoNfce =
	| "autorizada"
	| "rejeitada"
	| "duplicidade"
	| "desconhecida";

export type ClasseConsultaChaveNfce =
	| "autorizada"
	| "cancelada"
	| "denegada"
	| "nao_encontrada"
	| "rejeitada"
	| "desconhecida";

export type ResumoDocumentoNfce = {
	cnpjEmitente: string | null;
	modelo: string | null;
	serie: string | null;
	numero: string | null;
	tpEmis: string | null;
	chave: string | null;
	documentoDestinatario: string | null;
	valorTotal: number | null;
	quantidadeItens: number | null;
	quantidadeTotal: number | null;
	desconto: number | null;
	acrescimo: number | null;
	pagamentos: Array<{ tPag: string; vPag: number }>;
};

export type DivergenciaDocumentoNfce = {
	campo: string;
	local: string;
	sefaz: string;
};

export type ResultadoComparacaoNfce = {
	equivalente: boolean;
	evidenciaInsuficiente: boolean;
	divergencias: DivergenciaDocumentoNfce[];
	avisos: string[];
};

export type DecisaoConciliacaoNfce = {
	acao: AcaoConciliacaoNfce;
	regra: string;
	prosseguirTransmissao: boolean;
};
