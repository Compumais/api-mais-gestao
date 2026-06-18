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
import { DATA } from "@/constants/nav-constants";
import { useAuth } from "@/hooks/use-auth";
import { CPlusIcon } from "./icons/c-plus";
import { NavDocuments } from "./nav-documents";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { user } = useAuth();

	const isUsuario = React.useMemo(() => {
		if (!user?.perfil) return false;
		return user.perfil.includes("usuario");
	}, [user]);

	const navMainItems = React.useMemo(() => {
		if (isUsuario) {
			return DATA.navMain.filter(
				(item) => item.title === "Dashboard" || item.title === "Clientes",
			);
		}
		return DATA.navMain;
	}, [isUsuario]);

	const navSecondaryItems = React.useMemo(() => {
		let items = DATA.navSecondary;

		if (isUsuario) {
			items = items.filter(
				(item) =>
					item.title === "Configura??es" ||
					item.title === "Ajuda" ||
					item.title === "Pesquisar",
			);
		}

		return items;
	}, [isUsuario]);

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
				<NavMain items={navMainItems} />

				{!isUsuario && (
					<NavDocuments label="PDV Gourmet" items={DATA.navGourmet} />
				)}

				<NavDocuments label="Cadastros" items={DATA.navRegistros} />
				<NavDocuments label="Notas fiscais" items={DATA.navNotaFiscal} />
				<NavDocuments label="Financeiro" items={DATA.navFinanceiro} />
				<NavDocuments label="Painel do contador" items={DATA.others} />
				<NavDocuments label="Ferramentas" items={DATA.navFerramentas} />

				<NavSecondary
					label="Outros"
					items={navSecondaryItems}
					className="mt-auto"
				/>
			</SidebarContent>

			<SidebarFooter>
				<NavUser user={user as { nome: string; email: string } | null} />
			</SidebarFooter>
		</Sidebar>
	);
}
