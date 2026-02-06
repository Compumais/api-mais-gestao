"use client";

import {
	IconArrowsLeftRight,
	IconBuildingBank,
	IconCashBanknoteMinus,
	IconCashBanknotePlus,
	IconChartBar,
	IconCreditCard,
	IconDashboard,
	IconHelp,
	IconHistory,
	IconListDetails,
	IconMoneybag,
	IconSearch,
	IconSettings,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
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
import { useAuth } from "@/hooks/use-auth";
import { CPlusIcon } from "./icons/c-plus";

const data = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: IconDashboard,
		},
		{
			title: "Clientes",
			url: "/clientes",
			icon: IconUsers,
		},
		// {
		// 	title: "Fornecedores",
		// 	url: "/fornecedores",
		// 	icon: IconBuilding,
		// },
		{
			title: "Usuários",
			url: "/usuarios",
			icon: IconUser,
		},
	],
	navClouds: [
		{
			title: "Plano de contas",
			url: "/plano-contas",
			icon: IconListDetails,
		},
		{
			title: "Bancos",
			url: "/bancos",
			icon: IconBuildingBank,
		},
		{
			title: "Contas correntes",
			url: "/contas-correntes",
			icon: IconCreditCard,
		},
		{
			title: "Movimentações",
			url: "/movimentacoes",
			icon: IconArrowsLeftRight,
		},
		{
			title: "Contas a receber",
			url: "/contas-receber",
			icon: IconCashBanknotePlus,
		},
		{
			title: "Contas a pagar",
			url: "/contas-pagar",
			icon: IconCashBanknoteMinus,
		},
		// {
		// 	title: "Conciliação",
		// 	url: "#",
		// 	icon: IconArrowsLeftRight,
		// },
		{
			title: "Relatórios",
			url: "/relatorios",
			icon: IconChartBar,
		},
	],
	navSecondary: [
		{
			title: "Configurações",
			url: "#",
			icon: IconSettings,
		},
		{
			title: "Auditoria",
			url: "/auditoria",
			icon: IconHistory,
		},
		{
			title: "Ajuda",
			url: "#",
			icon: IconHelp,
		},
		{
			title: "Pesquisar",
			url: "#",
			icon: IconSearch,
		},
	],
	// documents: [
	// 	{
	// 		name: "Data Library",
	// 		url: "#",
	// 		icon: IconDatabase,
	// 	},
	// 	{
	// 		name: "Reports",
	// 		url: "#",
	// 		icon: IconReport,
	// 	},
	// 	{
	// 		name: "Word Assistant",
	// 		url: "#",
	// 		icon: IconFileWord,
	// 	},
	// ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { user } = useAuth();

	// Verificar se o usuário tem perfil "usuario"
	const isUsuario = React.useMemo(() => {
		if (!user?.perfil) return false;
		// A API retorna o perfil como string (primeiro elemento do array)
		return user.perfil === "usuario";
	}, [user?.perfil]);

	// Filtrar itens baseado no perfil
	const navMainItems = React.useMemo(() => {
		if (isUsuario) {
			// Para usuário: apenas Dashboard e Clientes
			return data.navMain.filter(
				(item) => item.title === "Dashboard" || item.title === "Clientes",
			);
		}
		return data.navMain;
	}, [isUsuario]);

	const navCloudsItems = React.useMemo(() => {
		if (isUsuario) {
			// Para usuário: apenas Movimentações
			return data.navClouds.filter((item) => item.title === "Movimentações");
		}
		return data.navClouds;
	}, [isUsuario]);

	const navSecondaryItems = React.useMemo(() => {
		if (isUsuario) {
			// Para usuário: Configurações, Ajuda e Pesquisar (sem Auditoria)
			return data.navSecondary.filter(
				(item) =>
					item.title === "Configurações" ||
					item.title === "Ajuda" ||
					item.title === "Pesquisar",
			);
		}
		return data.navSecondary;
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
				{navCloudsItems.length > 0 && (
					<NavSecondary label="Financeiro" items={navCloudsItems} />
				)}
				{/* <NavDocuments items={data.documents} /> */}
				<NavSecondary
					label="Outros"
					items={navSecondaryItems}
					className="mt-auto"
				/>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
		</Sidebar>
	);
}
