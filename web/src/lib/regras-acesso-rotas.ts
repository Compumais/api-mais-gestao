import type { AcessoNavegacao } from "./acesso-navegacao";
import {
	type ContextoAcesso,
	podeAcessarPorPolitica,
} from "./acesso-navegacao";

/**
 * Regras de rota por prefixo. Ordem: mais específico primeiro.
 * Usado por ProtectedRoute e busca global.
 */
export const REGRAS_ACESSO_ROTAS: Array<{
	prefixo: string;
	acesso: AcessoNavegacao;
}> = [
	{
		prefixo: "/ordens-servico",
		acesso: {
			feature: "ordem_servico",
			perfis: ["proprietario", "admin", "financeiro", "usuario"],
		},
	},
	{
		prefixo: "/tipos-problema",
		acesso: {
			feature: "ordem_servico",
			perfis: ["proprietario", "admin", "financeiro", "usuario"],
		},
	},
	{
		prefixo: "/nota-fiscal-servico",
		acesso: {
			modulo: "nfse",
			perfis: ["proprietario", "admin", "financeiro"],
		},
	},
	{
		prefixo: "/nota-fiscal-venda",
		acesso: {
			feature: "notas_fiscais",
			perfis: ["proprietario", "admin", "financeiro"],
		},
	},
	{
		prefixo: "/nfce",
		acesso: {
			feature: "notas_fiscais",
			perfis: ["proprietario", "admin", "financeiro"],
		},
	},
	{
		prefixo: "/pedidos",
		acesso: {
			feature: "notas_fiscais",
			perfis: ["proprietario", "admin", "financeiro", "usuario"],
		},
	},
	{
		prefixo: "/grupos-gourmet",
		acesso: {
			modulo: "gourmet",
		},
	},
	{
		prefixo: "/gourmet",
		acesso: {
			modulo: "gourmet",
			perfis: ["proprietario", "admin", "garcom"],
		},
	},
	{
		prefixo: "/garcom",
		acesso: {
			modulo: "gourmet",
			perfis: ["proprietario", "admin", "garcom"],
		},
	},
	{
		prefixo: "/usuarios",
		acesso: {
			perfis: ["proprietario", "admin"],
		},
	},
	{
		prefixo: "/meus-planos",
		acesso: {
			perfis: ["proprietario"],
		},
	},
	{
		prefixo: "/checkout",
		acesso: {
			perfis: ["proprietario"],
		},
	},
	{
		prefixo: "/assinatura",
		acesso: {
			perfis: ["proprietario"],
		},
	},
	{
		prefixo: "/plano-contas",
		acesso: {
			perfis: ["proprietario", "admin", "financeiro"],
		},
	},
	{
		prefixo: "/contabilidade/efd-contribuicoes",
		acesso: {
			feature: "sped_efd",
			perfis: ["proprietario", "admin", "financeiro"],
		},
	},
	{
		prefixo: "/contabilidade/efd",
		acesso: {
			feature: "sped_efd",
			perfis: ["proprietario", "admin", "financeiro"],
		},
	},
	{
		prefixo: "/contabilidade/apuracao-efd",
		acesso: {
			feature: "sped_efd",
			perfis: ["proprietario", "admin", "financeiro"],
		},
	},
];

export function obterRegraAcessoRota(
	pathname: string,
): AcessoNavegacao | undefined {
	const path = pathname.split("?")[0] ?? pathname;
	const regra = REGRAS_ACESSO_ROTAS.find(
		(r) => path === r.prefixo || path.startsWith(`${r.prefixo}/`),
	);
	return regra?.acesso;
}

export function podeAcessarRota(
	pathname: string,
	ctx: ContextoAcesso,
): boolean {
	const acesso = obterRegraAcessoRota(pathname);
	return podeAcessarPorPolitica(acesso, ctx);
}
