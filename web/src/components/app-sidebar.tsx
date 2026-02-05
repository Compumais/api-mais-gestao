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
			url: "/contas-a-receber",
			icon: IconCashBanknotePlus,
		},
		{
			title: "Contas a pagar",
			url: "/contas-a-pagar",
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

	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader>
				<SidebarMenu className="flex flex-row items-center gap-1 select-none">
					<CPlusIcon size={32} />
					<h1 className="text-base font-semibold mb-0.5">Mais Gestão</h1>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavSecondary label="Financeiro" items={data.navClouds} />
				{/* <NavDocuments items={data.documents} /> */}
				<NavSecondary
					label="Outros"
					items={data.navSecondary}
					className="mt-auto"
				/>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
		</Sidebar>
	);
}
