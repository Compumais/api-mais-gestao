import {
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
	navGourmet: [
		{
			title: "PDV",
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
				{
					title: "Venda rápida",
					url: "/gourmet/venda-rapida",
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
					title: "Nota fiscal de venda",
					url: "/nota-fiscal-venda",
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
					title: "CFOP de-para",
					url: "/tributos/cfop-depara",
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
