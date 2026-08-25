"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { DATA, type NavItem } from "@/constants/nav-constants";
import { useAuth } from "@/hooks/use-auth";
import { NavFixadosProvider } from "@/hooks/use-nav-fixados";
import { useEntitlements } from "@/hooks/use-plano";
import {
	type ContextoAcesso,
	isPerfilMenuRestrito,
	podeAcessarPorPolitica,
} from "@/lib/acesso-navegacao";
import { coletarItensNavFixaveis } from "@/lib/nav-fixados";
import { isGarcom } from "@/lib/perfis";
import { CPlusIcon } from "./icons/c-plus";
import { NavDocuments } from "./nav-documents";
import { NavFixados } from "./nav-fixados";

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { user } = useAuth();
	const { hasFeature, hasModulo } = useEntitlements();

	const isGarcomUser = React.useMemo(() => isGarcom(user), [user]);
	const isUsuarioRestrito = React.useMemo(
		() => isPerfilMenuRestrito(user?.perfil),
		[user],
	);

	const ctxAcesso = React.useMemo<ContextoAcesso>(
		() => ({
			perfil: user?.perfil,
			hasFeature,
			hasModulo,
		}),
		[user?.perfil, hasFeature, hasModulo],
	);

	const navMainItems = React.useMemo(() => {
		if (isUsuarioRestrito) {
			return DATA.navMain.filter(
				(item) => item.title === "Dashboard" || item.title === "Pesquisar",
			);
		}
		return filtrarNavItems(DATA.navMain, ctxAcesso);
	}, [isUsuarioRestrito, ctxAcesso]);

	const navVendasItems = React.useMemo(
		() => filtrarNavItems(DATA.navVendas, ctxAcesso),
		[ctxAcesso],
	);

	const navCadastrosItems = React.useMemo(() => {
		if (isUsuarioRestrito) {
			return filtrarCadastrosRestrito(DATA.navCadastros);
		}
		return filtrarNavItems(DATA.navCadastros, ctxAcesso);
	}, [isUsuarioRestrito, ctxAcesso]);

	const navEstoqueItems = React.useMemo(
		() => filtrarNavItems(DATA.navEstoque, ctxAcesso),
		[ctxAcesso],
	);

	const navFinanceiroItems = React.useMemo(
		() => filtrarNavItems(DATA.navFinanceiro, ctxAcesso),
		[ctxAcesso],
	);

	const navFiscalItems = React.useMemo(
		() => filtrarNavItems(DATA.navFiscal, ctxAcesso),
		[ctxAcesso],
	);

	const navContabilidadeItems = React.useMemo(
		() => filtrarNavItems(DATA.navContabilidade, ctxAcesso),
		[ctxAcesso],
	);

	const navSistemaItems = React.useMemo(
		() => filtrarNavItems(DATA.navSistema, ctxAcesso),
		[ctxAcesso],
	);

	const navSecondaryItems = React.useMemo(() => {
		if (!isUsuarioRestrito) return [];
		return filtrarNavItems(DATA.navSecondary, ctxAcesso);
	}, [isUsuarioRestrito, ctxAcesso]);

	const itensNavFixaveis = React.useMemo(
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

	return (
		<NavFixadosProvider userId={user?.id}>
			<Sidebar collapsible="icon" {...props}>
				<SidebarHeader>
					<SidebarMenu className="flex flex-row items-center gap-1 select-none">
						<CPlusIcon size={32} />
						<h1 className="text-base font-semibold mb-0.5 group-data-[collapsible=icon]:hidden">
							Mais Gestão
						</h1>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					{isGarcomUser ? (
						<>
							<NavFixados itensDisponiveis={itensNavFixaveis} />
							<NavDocuments label="Vendas e operação" items={navVendasItems} />
						</>
					) : (
						<>
							<NavMain items={navMainItems} />
							<NavFixados itensDisponiveis={itensNavFixaveis} />

							{!isUsuarioRestrito && navVendasItems.length > 0 && (
								<NavDocuments
									label="Vendas e operação"
									items={navVendasItems}
								/>
							)}

							{navCadastrosItems.length > 0 && (
								<NavDocuments label="Cadastros" items={navCadastrosItems} />
							)}

							{!isUsuarioRestrito && navEstoqueItems.length > 0 && (
								<NavDocuments label="Estoque" items={navEstoqueItems} />
							)}

							{!isUsuarioRestrito && navFinanceiroItems.length > 0 && (
								<NavDocuments label="Financeiro" items={navFinanceiroItems} />
							)}

							{!isUsuarioRestrito && navFiscalItems.length > 0 && (
								<NavDocuments
									label="Fiscal e tributário"
									items={navFiscalItems}
								/>
							)}

							{!isUsuarioRestrito && navContabilidadeItems.length > 0 && (
								<NavDocuments
									label="Contabilidade"
									items={navContabilidadeItems}
								/>
							)}

							{!isUsuarioRestrito && navSistemaItems.length > 0 && (
								<NavDocuments
									label="Administração e sistema"
									items={navSistemaItems}
								/>
							)}

							{isUsuarioRestrito && navSecondaryItems.length > 0 && (
								<NavSecondary
									label="Outros"
									items={navSecondaryItems}
									className="mt-auto"
								/>
							)}
						</>
					)}
				</SidebarContent>

				<SidebarFooter>
					<NavUser user={user as { nome: string; email: string } | null} />
				</SidebarFooter>
			</Sidebar>
		</NavFixadosProvider>
	);
}
