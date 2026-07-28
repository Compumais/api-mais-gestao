export const FEATURES_SAAS = {
	CONTAS_PAGAR_RECEBER: "contas_pagar_receber",
	SUPORTE_EMAIL: "suporte_email",
	DASHBOARD_SIMPLIFICADO: "dashboard_simplificado",
	ORDEM_SERVICO: "ordem_servico",
	RELATORIOS_AVANCADOS: "relatorios_avancados",
	DASHBOARD_COMPLETO: "dashboard_completo",
	API_INTEGRACOES: "api_integracoes",
	NOTAS_FISCAIS: "notas_fiscais",
	GESTAO_MULTI_EMPRESA: "gestao_multi_empresa",
	CONSOLIDACAO_RELATORIOS: "consolidacao_relatorios",
} as const;

export type FeatureSaasCodigo =
	(typeof FEATURES_SAAS)[keyof typeof FEATURES_SAAS];

export const MODULOS_SAAS = {
	GOURMET: "gourmet",
	NFSE: "nfse",
	IA_FINANCEIRA: "ia_financeira",
} as const;

export type ModuloSaasCodigo =
	(typeof MODULOS_SAAS)[keyof typeof MODULOS_SAAS];

export type TipoPlanoCodigo = "BASIC" | "PREMIUM" | "ENTERPRISE";

export const HIERARQUIA_PLANOS: TipoPlanoCodigo[] = [
	"BASIC",
	"PREMIUM",
	"ENTERPRISE",
];

export function obterIndicePlano(plano: string): number {
	return HIERARQUIA_PLANOS.indexOf(plano as TipoPlanoCodigo);
}

export function isPlanoSuperior(planoAtual: string, planoNovo: string): boolean {
	return obterIndicePlano(planoNovo) > obterIndicePlano(planoAtual);
}

export function isPlanoInferior(planoAtual: string, planoNovo: string): boolean {
	return obterIndicePlano(planoNovo) < obterIndicePlano(planoAtual);
}

export const FEATURES_POR_PLANO: Record<TipoPlanoCodigo, FeatureSaasCodigo[]> = {
	BASIC: [
		FEATURES_SAAS.CONTAS_PAGAR_RECEBER,
		FEATURES_SAAS.SUPORTE_EMAIL,
		FEATURES_SAAS.DASHBOARD_SIMPLIFICADO,
		FEATURES_SAAS.ORDEM_SERVICO,
	],
	PREMIUM: [
		FEATURES_SAAS.CONTAS_PAGAR_RECEBER,
		FEATURES_SAAS.SUPORTE_EMAIL,
		FEATURES_SAAS.DASHBOARD_SIMPLIFICADO,
		FEATURES_SAAS.ORDEM_SERVICO,
		FEATURES_SAAS.RELATORIOS_AVANCADOS,
		FEATURES_SAAS.DASHBOARD_COMPLETO,
		FEATURES_SAAS.API_INTEGRACOES,
		FEATURES_SAAS.NOTAS_FISCAIS,
	],
	ENTERPRISE: [
		FEATURES_SAAS.CONTAS_PAGAR_RECEBER,
		FEATURES_SAAS.SUPORTE_EMAIL,
		FEATURES_SAAS.DASHBOARD_SIMPLIFICADO,
		FEATURES_SAAS.ORDEM_SERVICO,
		FEATURES_SAAS.RELATORIOS_AVANCADOS,
		FEATURES_SAAS.DASHBOARD_COMPLETO,
		FEATURES_SAAS.API_INTEGRACOES,
		FEATURES_SAAS.NOTAS_FISCAIS,
		FEATURES_SAAS.GESTAO_MULTI_EMPRESA,
		FEATURES_SAAS.CONSOLIDACAO_RELATORIOS,
	],
};
