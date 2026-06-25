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

export const DATA = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: IconDashboard,
		},
	],
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
					title: "Fechamentos de caixa",
					url: "/fechamentos-caixa",
				},
			],
		},
	],
	navGourmet: [
		{
			title: "Gourmet",
			icon: IconToolsKitchen2,
			items: [
				{
					title: "Mesas",
					url: "/gourmet",
				},
				{
					title: "Garçom",
					url: "/garcom",
				},
			],
		},
	],
	navRegistros: [
		{
			title: "Cadastros",
			icon: IconListDetails,
			items: [
				{
					title: "Clientes",
					url: "/clientes",
				},
				// {
				// 	title: "Comissionados",
				// 	url: "/comissionados",
				// },
				// {
				// 	title: "Compradores",
				// 	url: "/compradores",
				// },
				{
					title: "Fornecedores",
					url: "/fornecedores",
				},
				{
					title: "Produtos",
					url: "/produtos",
				},
				{
					title: "Estoque",
					url: "/estoque",
				},
				{
					title: "Grupos",
					url: "/grupos",
				},
				{
					title: "Unidades de medida",
					url: "/unidade-medida",
				},
				{
					title: "Meios de pagamento",
					url: "/meios-pagamento",
				},
				{
					title: "Usuários",
					url: "/usuarios",
				},
			],
		},
	],
	navNotaFiscal: [
		{
			title: "Nota fiscal",
			icon: IconFileInvoice,
			items: [
				{
					title: "Nota fiscal de compra",
					url: "/nota-fiscal-compra",
				},
				{
					title: "Relatório de compras",
					url: "/nota-fiscal-compra/relatorio",
				},
				{
					title: "Nota fiscal de venda",
					url: "/nota-fiscal-venda",
				},
				{
					title: "Relatório de vendas",
					url: "/nota-fiscal-venda/relatorio",
				},
				{
					title: "NFC-e",
					url: "/nfce",
				},
				{
					title: "Pedidos",
					url: "/pedidos",
				},
			],
		},
	],
	navTributos: [
		{
			title: "Tributos",
			icon: IconReceiptTax,
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
	],
	navFinanceiro: [
		{
			title: "Financeiro",
			icon: IconCoins,
			items: [
				{
					title: "Plano de contas",
					url: "/plano-contas",
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
	],
	others: [
		{
			title: "Contabilidade",
			icon: IconReportMoney,
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
					title: "Exportar XMLs fiscais",
					url: "/contabilidade/exportar-xmls",
				},
				{
					title: "Relatórios fiscais",
					url: "/contabilidade/relatorios",
				},
			],
		},
	],
	navFerramentas: [
		{
			title: "Ferramentas",
			icon: IconTools,
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
			],
		},
	],
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
	],
};
