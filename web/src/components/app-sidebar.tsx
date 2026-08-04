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
import { useEntitlements } from "@/hooks/use-plano";
import {
	type ContextoAcesso,
	isPerfilMenuRestrito,
	podeAcessarPorPolitica,
} from "@/lib/acesso-navegacao";
import { isGarcom } from "@/lib/perfis";
import { CPlusIcon } from "./icons/c-plus";
import { NavDocuments } from "./nav-documents";

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
		.filter((item) => !item.items || item.items.length > 0);
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
				(item) => item.title === "Dashboard" || item.title === "Clientes",
			);
		}
		return filtrarNavItems(DATA.navMain, ctxAcesso);
	}, [isUsuarioRestrito, ctxAcesso]);

	const navSecondaryItems = React.useMemo(() => {
		let items = filtrarNavItems(DATA.navSecondary, ctxAcesso);

		if (isUsuarioRestrito) {
			items = items.filter(
				(item) =>
					item.title === "Configurações" ||
					item.title === "Ajuda" ||
					item.title === "Pesquisar",
			);
		}

		return items;
	}, [isUsuarioRestrito, ctxAcesso]);

	const navPdvItems = React.useMemo(
		() => filtrarNavItems(DATA.navPdv, ctxAcesso),
		[ctxAcesso],
	);

	const navGourmetItems = React.useMemo(
		() => filtrarNavItems(DATA.navGourmet, ctxAcesso),
		[ctxAcesso],
	);

	const navNotaFiscalItems = React.useMemo(
		() => filtrarNavItems(DATA.navNotaFiscal, ctxAcesso),
		[ctxAcesso],
	);

	const navRegistrosItems = React.useMemo(() => {
		if (isUsuarioRestrito) {
			return DATA.navRegistros.map((group) => ({
				...group,
				items: group.items?.filter((item) => item.url === "/clientes"),
			}));
		}
		return filtrarNavItems(DATA.navRegistros, ctxAcesso);
	}, [isUsuarioRestrito, ctxAcesso]);

	const navTributosItems = React.useMemo(
		() => filtrarNavItems(DATA.navTributos, ctxAcesso),
		[ctxAcesso],
	);

	const navFinanceiroItems = React.useMemo(
		() => filtrarNavItems(DATA.navFinanceiro, ctxAcesso),
		[ctxAcesso],
	);

	const navContabilidadeItems = React.useMemo(
		() => filtrarNavItems(DATA.others, ctxAcesso),
		[ctxAcesso],
	);

	const navFerramentasItems = React.useMemo(
		() => filtrarNavItems(DATA.navFerramentas, ctxAcesso),
		[ctxAcesso],
	);

	const exibirGourmet = hasModulo("gourmet");

	return (
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
						<NavDocuments label="PDV" items={navPdvItems} />
						{exibirGourmet && (
							<NavDocuments label="Gourmet" items={navGourmetItems} />
						)}
					</>
				) : (
					<>
						<NavMain items={navMainItems} />

						{!isUsuarioRestrito && navPdvItems.length > 0 && (
							<NavDocuments label="PDV" items={navPdvItems} />
						)}

						{!isUsuarioRestrito && exibirGourmet && (
							<NavDocuments label="Gourmet" items={navGourmetItems} />
						)}

						<NavDocuments label="Cadastros" items={navRegistrosItems} />

						{!isUsuarioRestrito && (
							<NavDocuments label="Notas fiscais" items={navNotaFiscalItems} />
						)}
						{!isUsuarioRestrito && navTributosItems.length > 0 && (
							<NavDocuments label="Tributos" items={navTributosItems} />
						)}
						{!isUsuarioRestrito && navFinanceiroItems.length > 0 && (
							<NavDocuments label="Financeiro" items={navFinanceiroItems} />
						)}
						{!isUsuarioRestrito && navContabilidadeItems.length > 0 && (
							<NavDocuments
								label="Painel do contador"
								items={navContabilidadeItems}
							/>
						)}
						{!isUsuarioRestrito && navFerramentasItems.length > 0 && (
							<NavDocuments label="Ferramentas" items={navFerramentasItems} />
						)}

						<NavSecondary
							label="Outros"
							items={navSecondaryItems}
							className="mt-auto"
						/>
					</>
				)}
			</SidebarContent>

			<SidebarFooter>
				<NavUser user={user as { nome: string; email: string } | null} />
			</SidebarFooter>
		</Sidebar>
	);
}
