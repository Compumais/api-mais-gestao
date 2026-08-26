"use client";

import { useMemo } from "react";
import { DATA, type NavItem } from "@/constants/nav-constants";
import { useAuth } from "@/hooks/use-auth";
import { useEntitlements } from "@/hooks/use-plano";
import {
	type ContextoAcesso,
	isPerfilMenuRestrito,
	podeAcessarPorPolitica,
} from "@/lib/acesso-navegacao";
import { coletarItensNavFixaveis } from "@/lib/nav-fixados";
import { isGarcom } from "@/lib/perfis";

export type NavSecaoTopbar = {
	label: string;
	items: NavItem[];
};

function filtrarNavItems(items: NavItem[], ctx: ContextoAcesso): NavItem[] {
	return items
		.filter((item) => podeAcessarPorPolitica(item.acesso, ctx))
		.map((item) => {
			if (!item.items) return item;
			const subitens = item.items.filter((sub) =>
				podeAcessarPorPolitica(sub.acesso, ctx),
			);
			return { ...item, items: subitens };
		})
		.filter((item) => {
			if (item.items) return item.items.length > 0;
			return Boolean(item.url);
		});
}

function filtrarCadastrosRestrito(items: NavItem[]): NavItem[] {
	return items
		.map((group) => ({
			...group,
			items: group.items?.filter((item) => item.url === "/clientes"),
		}))
		.filter((group) => (group.items?.length ?? 0) > 0);
}

export function useNavFiltrada() {
	const { user } = useAuth();
	const { hasFeature, hasModulo } = useEntitlements();

	const isGarcomUser = useMemo(() => isGarcom(user), [user]);
	const isUsuarioRestrito = useMemo(
		() => isPerfilMenuRestrito(user?.perfil),
		[user],
	);

	const ctxAcesso = useMemo<ContextoAcesso>(
		() => ({
			perfil: user?.perfil,
			hasFeature,
			hasModulo,
		}),
		[user?.perfil, hasFeature, hasModulo],
	);

	const navMainItems = useMemo(() => {
		if (isUsuarioRestrito) {
			return DATA.navMain.filter(
				(item) => item.title === "Dashboard" || item.title === "Pesquisar",
			);
		}
		return filtrarNavItems(DATA.navMain, ctxAcesso);
	}, [isUsuarioRestrito, ctxAcesso]);

	const navVendasItems = useMemo(
		() => filtrarNavItems(DATA.navVendas, ctxAcesso),
		[ctxAcesso],
	);

	const navCadastrosItems = useMemo(() => {
		if (isUsuarioRestrito) {
			return filtrarCadastrosRestrito(DATA.navCadastros);
		}
		return filtrarNavItems(DATA.navCadastros, ctxAcesso);
	}, [isUsuarioRestrito, ctxAcesso]);

	const navEstoqueItems = useMemo(
		() => filtrarNavItems(DATA.navEstoque, ctxAcesso),
		[ctxAcesso],
	);

	const navFinanceiroItems = useMemo(
		() => filtrarNavItems(DATA.navFinanceiro, ctxAcesso),
		[ctxAcesso],
	);

	const navFiscalItems = useMemo(
		() => filtrarNavItems(DATA.navFiscal, ctxAcesso),
		[ctxAcesso],
	);

	const navContabilidadeItems = useMemo(
		() => filtrarNavItems(DATA.navContabilidade, ctxAcesso),
		[ctxAcesso],
	);

	const navSistemaItems = useMemo(
		() => filtrarNavItems(DATA.navSistema, ctxAcesso),
		[ctxAcesso],
	);

	const navSecondaryItems = useMemo(() => {
		if (!isUsuarioRestrito) return [];
		return filtrarNavItems(DATA.navSecondary, ctxAcesso);
	}, [isUsuarioRestrito, ctxAcesso]);

	const itensNavFixaveis = useMemo(
		() =>
			coletarItensNavFixaveis([
				navMainItems,
				navVendasItems,
				navCadastrosItems,
				navEstoqueItems,
				navFinanceiroItems,
				navFiscalItems,
				navContabilidadeItems,
				navSistemaItems,
				navSecondaryItems,
			]),
		[
			navMainItems,
			navVendasItems,
			navCadastrosItems,
			navEstoqueItems,
			navFinanceiroItems,
			navFiscalItems,
			navContabilidadeItems,
			navSistemaItems,
			navSecondaryItems,
		],
	);

	const secoesTopbar = useMemo((): NavSecaoTopbar[] => {
		if (isGarcomUser) {
			const secoes: NavSecaoTopbar[] = [];
			if (navVendasItems.length > 0) {
				secoes.push({ label: "Vendas e operação", items: navVendasItems });
			}
			return secoes;
		}

		const secoes: NavSecaoTopbar[] = [];

		if (!isUsuarioRestrito && navVendasItems.length > 0) {
			secoes.push({ label: "Vendas e operação", items: navVendasItems });
		}
		if (navCadastrosItems.length > 0) {
			secoes.push({ label: "Cadastros", items: navCadastrosItems });
		}
		if (!isUsuarioRestrito && navEstoqueItems.length > 0) {
			secoes.push({ label: "Estoque", items: navEstoqueItems });
		}
		if (!isUsuarioRestrito && navFinanceiroItems.length > 0) {
			secoes.push({ label: "Financeiro", items: navFinanceiroItems });
		}
		if (!isUsuarioRestrito && navFiscalItems.length > 0) {
			secoes.push({ label: "Fiscal e tributário", items: navFiscalItems });
		}
		if (!isUsuarioRestrito && navContabilidadeItems.length > 0) {
			secoes.push({ label: "Contabilidade", items: navContabilidadeItems });
		}
		if (!isUsuarioRestrito && navSistemaItems.length > 0) {
			secoes.push({ label: "Administração e sistema", items: navSistemaItems });
		}
		if (isUsuarioRestrito && navSecondaryItems.length > 0) {
			secoes.push({ label: "Outros", items: navSecondaryItems });
		}

		return secoes;
	}, [
		isGarcomUser,
		isUsuarioRestrito,
		navVendasItems,
		navCadastrosItems,
		navEstoqueItems,
		navFinanceiroItems,
		navFiscalItems,
		navContabilidadeItems,
		navSistemaItems,
		navSecondaryItems,
	]);

	return {
		user,
		isGarcomUser,
		isUsuarioRestrito,
		navMainItems,
		navVendasItems,
		navCadastrosItems,
		navEstoqueItems,
		navFinanceiroItems,
		navFiscalItems,
		navContabilidadeItems,
		navSistemaItems,
		navSecondaryItems,
		itensNavFixaveis,
		secoesTopbar,
	};
}
