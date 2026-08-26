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
import { useNavFiltrada } from "@/hooks/use-nav-filtrada";
import { NavFixadosProvider } from "@/hooks/use-nav-fixados";
import { CPlusIcon } from "./icons/c-plus";
import { NavDocuments } from "./nav-documents";
import { NavFixados } from "./nav-fixados";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const {
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
	} = useNavFiltrada();

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
