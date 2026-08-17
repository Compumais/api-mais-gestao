import type { Icon } from "@tabler/icons-react";
import {
	IconCashRegister,
	IconCoins,
	IconDashboard,
	IconFileInvoice,
	IconHelp,
	IconHistory,
	IconListDetails,
	IconReceiptTax,
	IconReportMoney,
	IconSearch,
	IconSettings,
	IconTools,
	IconToolsKitchen2,
} from "@tabler/icons-react";
import type { AcessoNavegacao } from "@/lib/acesso-navegacao";

export type NavItem = {
	title: string;
	url?: string;
	icon?: Icon;
	items?: NavSubItem[];
	acesso?: AcessoNavegacao;
};

export type NavSubItem = {
	title: string;
	url: string;
	acesso?: AcessoNavegacao;
};

export const DATA = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: IconDashboard,
		},
	] satisfies NavItem[],
	navPdv: [
		{
			title: "PDV",
			icon: IconCashRegister,
			items: [
				{
					title: "Venda rápida",
					url: "/pdv",
				},
				{
					title: "Histórico de vendas",
					url: "/vendas-pdv",
				},
				{
					title: "Pedidos da maquininha",
					url: "/pedidos?origem=POS",
					acesso: { feature: "notas_fiscais" },
				},
				{
					title: "Fechamentos de caixa",
					url: "/fechamentos-caixa",
				},
			],
		},
	] satisfies NavItem[],
	navGourmet: [
		{
			title: "Gourmet",
			icon: IconToolsKitchen2,
			acesso: { modulo: "gourmet" },
			items: [
				{
					title: "Mesas",
					url: "/gourmet",
					acesso: { modulo: "gourmet" },
				},
				{
					title: "Garçom",
					url: "/garcom",
					acesso: {
						modulo: "gourmet",
						perfis: ["proprietario", "admin", "garcom"],
					},
				},
			],
		},
	] satisfies NavItem[],
	navRegistros: [
		{
			title: "Cadastros",
			icon: IconListDetails,
			items: [
				{
					title: "Clientes",
					url: "/clientes",
				},
				{
					title: "Fornecedores",
					url: "/fornecedores",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Produtos",
					url: "/produtos",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Serviços",
					url: "/servicos",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Estoque",
					url: "/estoque",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Grupos",
					url: "/grupos",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Grupos gourmet",
					url: "/grupos-gourmet",
				},
				{
					title: "Unidades de medida",
					url: "/unidade-medida",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Fatores de conversão",
					url: "/fator-conversao",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Meios de pagamento",
					url: "/meios-pagamento",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Tipos de problema",
					url: "/tipos-problema",
					acesso: {
						feature: "ordem_servico",
						perfis: ["proprietario", "admin", "financeiro", "usuario"],
					},
				},
				{
					title: "Usuários",
					url: "/usuarios",
					acesso: {
						perfis: ["proprietario", "admin"],
					},
				},
			],
		},
	] satisfies NavItem[],
	navNotaFiscal: [
		{
			title: "Nota fiscal",
			icon: IconFileInvoice,
			items: [
				{
					title: "Nota fiscal de compra",
					url: "/nota-fiscal-compra",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Nota fiscal de venda",
					url: "/nota-fiscal-venda",
					acesso: {
						feature: "notas_fiscais",
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Nota fiscal de serviço",
					url: "/nota-fiscal-servico",
					acesso: {
						modulo: "nfse",
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Captura SEFAZ",
					url: "/nota-fiscal-compra/captura-sefaz",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Consulta NFC-e",
					url: "/nfce",
					acesso: {
						feature: "notas_fiscais",
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Pedidos (DAV)",
					url: "/pedidos",
					acesso: {
						feature: "notas_fiscais",
						perfis: ["proprietario", "admin", "financeiro", "usuario"],
					},
				},
				{
					title: "Ordens de serviço",
					url: "/ordens-servico",
					acesso: {
						feature: "ordem_servico",
						perfis: ["proprietario", "admin", "financeiro", "usuario"],
					},
				},
			],
		},
	] satisfies NavItem[],
	navTributos: [
		{
			title: "Tributos",
			icon: IconReceiptTax,
			acesso: {
				perfis: ["proprietario", "admin", "financeiro"],
			},
			items: [
				{
					title: "Naturezas",
					url: "/tributos/naturezas",
				},
				{
					title: "Configuração fiscal",
					url: "/tributos/configuracao-fiscal",
				},
				{
					title: "Mapeamento CFOP",
					url: "/tributos/cfop-depara",
				},
				{
					title: "Parametrização de tributos",
					url: "/tributos/parametrizacao",
				},
				{
					title: "Taxas por UF",
					url: "/tributos/taxas",
				},
			],
		},
	] satisfies NavItem[],
	navFinanceiro: [
		{
			title: "Financeiro",
			icon: IconCoins,
			acesso: {
				perfis: ["proprietario", "admin", "financeiro"],
			},
			items: [
				{
					title: "Plano de contas",
					url: "/plano-contas",
					acesso: {
						perfis: ["proprietario", "admin", "financeiro"],
					},
				},
				{
					title: "Bancos",
					url: "/bancos",
				},
				{
					title: "Contas correntes",
					url: "/contas-correntes",
				},
				{
					title: "Movimentações",
					url: "/movimentacoes",
				},
				{
					title: "Contas a receber",
					url: "/contas-receber",
				},
				{
					title: "Contas a pagar",
					url: "/contas-pagar",
				},
				{
					title: "Conciliação",
					url: "#",
				},
				{
					title: "Relatórios",
					url: "/relatorios",
				},
			],
		},
	] satisfies NavItem[],
	others: [
		{
			title: "Contabilidade",
			icon: IconReportMoney,
			acesso: {
				perfis: ["proprietario", "admin", "financeiro"],
			},
			items: [
				{
					title: "Configuração",
					url: "/configuracao-contabilidade",
				},
				{
					title: "Integração contábil",
					url: "/integracao-contabil",
				},
				{
					title: "Código reduzidos",
					url: "/codigo-reduzidos",
				},
				{
					title: "Plano de contas contábeis",
					url: "/conta-contabil",
				},
				{
					title: "Gerar SINTEGRA",
					url: "/contabilidade/sintegra",
				},
				{
					title: "Exportar XMLs fiscais",
					url: "/contabilidade/exportar-xmls",
				},
			],
		},
	] satisfies NavItem[],
	navFerramentas: [
		{
			title: "Ferramentas",
			icon: IconTools,
			acesso: {
				perfis: ["proprietario", "admin"],
			},
			items: [
				{
					title: "Agendar tarefas",
					url: "/agendamentos",
				},
				{
					title: "Editor SQL",
					url: "/editor-sql",
				},
				{
					title: "Certificados digitais",
					url: "/certificados-digitais",
				},
				{
					title: "Envio de e-mails",
					url: "/envio-emails",
				},
				{
					title: "Exportar produtos MGV",
					url: "/ferramentas/exportar-mgv",
				},
			],
		},
	] satisfies NavItem[],
	navSecondary: [
		{
			title: "Configurações",
			url: "/configuracoes",
			icon: IconSettings,
		},
		{
			title: "Auditoria",
			url: "/auditoria",
			icon: IconHistory,
			acesso: {
				perfis: ["proprietario", "admin"],
			},
		},
		{
			title: "Ajuda",
			url: "/ajuda",
			icon: IconHelp,
		},
		{
			title: "Pesquisar",
			url: "#",
			icon: IconSearch,
		},
	] satisfies NavItem[],
};
