import type { Icon } from "@tabler/icons-react";
import {
	IconArrowsLeftRight,
	IconBuildingFactory,
	IconCashRegister,
	IconCoins,
	IconDashboard,
	IconFileInvoice,
	IconHelp,
	IconHistory,
	IconListDetails,
	IconPackage,
	IconReceiptTax,
	IconReportMoney,
	IconScale,
	IconSettings,
	IconShoppingCart,
	IconToolsKitchen2,
	IconUsers,
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

const PERFIS_GESTAO = ["proprietario", "admin", "financeiro"] as const;
const PERFIS_OPERACAO = [
	"proprietario",
	"admin",
	"financeiro",
	"usuario",
] as const;
const PERFIS_ADMIN = ["proprietario", "admin"] as const;

export const DATA = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: IconDashboard,
		},
	] satisfies NavItem[],

	navVendas: [
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
				{
					title: "Pedidos da maquininha",
					url: "/pedidos?origem=POS",
					acesso: { feature: "notas_fiscais" },
				},
			],
		},
		{
			title: "Pedidos (DAV)",
			url: "/pedidos",
			icon: IconFileInvoice,
			acesso: {
				feature: "notas_fiscais",
				perfis: [...PERFIS_OPERACAO],
			},
		},
		{
			title: "Ordens de serviço",
			url: "/ordens-servico",
			icon: IconListDetails,
			acesso: {
				feature: "ordem_servico",
				perfis: [...PERFIS_OPERACAO],
			},
		},
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

	navCadastros: [
		{
			title: "Pessoas",
			icon: IconUsers,
			items: [
				{
					title: "Clientes",
					url: "/clientes",
				},
				{
					title: "Fornecedores",
					url: "/fornecedores",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
			],
		},
		{
			title: "Catálogo",
			icon: IconListDetails,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Produtos",
					url: "/produtos",
				},
				{
					title: "Serviços",
					url: "/servicos",
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
					title: "Fatores de conversão",
					url: "/fator-conversao",
				},
			],
		},
		{
			title: "Gourmet",
			icon: IconToolsKitchen2,
			acesso: { modulo: "gourmet" },
			items: [
				{
					title: "Grupos gourmet",
					url: "/grupos-gourmet",
					acesso: { modulo: "gourmet" },
				},
			],
		},
		{
			title: "Gerais",
			icon: IconSettings,
			items: [
				{
					title: "Meios de pagamento",
					url: "/meios-pagamento",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Bancos",
					url: "/bancos",
					acesso: {
						perfis: [...PERFIS_ADMIN],
					},
				},
				{
					title: "Tipos de problema",
					url: "/tipos-problema",
					acesso: {
						feature: "ordem_servico",
						perfis: [...PERFIS_OPERACAO],
					},
				},
			],
		},
	] satisfies NavItem[],

	navEstoque: [
		{
			title: "Movimentações de produtos",
			url: "/produtos/relatorios/movimentacoes",
			icon: IconArrowsLeftRight,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
		},
		{
			title: "Fichas de produção",
			url: "/fichas-producao",
			icon: IconBuildingFactory,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
		},
		{
			title: "Produções",
			url: "/producoes",
			icon: IconHistory,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
		},
		{
			title: "Exportar balança (MGV)",
			url: "/ferramentas/exportar-mgv",
			icon: IconScale,
			acesso: {
				perfis: [...PERFIS_ADMIN],
			},
		},
	] satisfies NavItem[],

	navCompras: [
		{
			title: "Cotações",
			url: "/compras/cotacoes",
			icon: IconShoppingCart,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
		},
		{
			title: "Pedidos de compra",
			url: "/compras/pedidos",
			icon: IconShoppingCart,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
		},
	] satisfies NavItem[],

	navFinanceiro: [
		{
			title: "Financeiro",
			icon: IconCoins,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Contas a receber",
					url: "/contas-receber",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Contas a pagar",
					url: "/contas-pagar",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Contas correntes",
					url: "/contas-correntes",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Movimentações",
					url: "/movimentacoes",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Plano de contas",
					url: "/plano-contas",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Budget",
					url: "/budget",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Tipos de cobrança",
					url: "/tipos-cobranca",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Conciliação",
					url: "#",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
			],
		},
	] satisfies NavItem[],

	navRelatorios: [
		{
			title: "Produtos",
			icon: IconListDetails,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Visão geral",
					url: "/produtos/relatorios",
				},
				{
					title: "Qualidade do cadastro",
					url: "/produtos/relatorios/qualidade",
				},
				{
					title: "Cadastro",
					url: "/produtos/relatorios/cadastro",
				},
				{
					title: "EAN e identificação",
					url: "/produtos/relatorios/ean",
				},
				{
					title: "Preços e margens",
					url: "/produtos/relatorios/precos",
				},
				{
					title: "Parâmetros fiscais",
					url: "/produtos/relatorios/fiscal",
				},
				{
					title: "Comercial",
					url: "/produtos/relatorios/comercial",
				},
				{
					title: "Compras",
					url: "/produtos/relatorios/compras",
				},
				{
					title: "Unidades e conversões",
					url: "/produtos/relatorios/unidades",
				},
				{
					title: "Composição",
					url: "/produtos/relatorios/composicao",
				},
				{
					title: "Auditoria",
					url: "/produtos/relatorios/auditoria",
				},
			],
		},
		{
			title: "Estoque",
			icon: IconPackage,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Posição de estoque",
					url: "/produtos/relatorios/estoque",
				},
				{
					title: "Inventário de estoque",
					url: "/produtos/relatorios/inventario",
				},
				{
					title: "Movimentações de produtos",
					url: "/produtos/relatorios/movimentacoes",
				},
			],
		},
		{
			title: "Financeiro",
			icon: IconCoins,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Central financeira",
					url: "/relatorios",
				},
				{
					title: "DRE Gerencial",
					url: "/relatorios?abrir=dre",
				},
				{
					title: "Despesas por categoria",
					url: "/relatorios?abrir=despesas",
				},
				{
					title: "Fluxo de caixa",
					url: "/relatorios?abrir=fluxo-caixa",
				},
				{
					title: "Contas a pagar",
					url: "/relatorios?abrir=contas-pagar",
				},
				{
					title: "Contas a receber",
					url: "/relatorios?abrir=contas-receber",
				},
			],
		},
		{
			title: "Fiscal",
			icon: IconReceiptTax,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Relatórios fiscais",
					url: "/relatorios/fiscais",
				},
				{
					title: "Notas fiscais",
					url: "/relatorios/notas-fiscais",
					acesso: {
						feature: "notas_fiscais",
					},
				},
				{
					title: "Relatório de compras",
					url: "/relatorios/fiscais/compras",
				},
				{
					title: "Relatório de vendas",
					url: "/relatorios/fiscais/vendas",
				},
			],
		},
	] satisfies NavItem[],

	navFiscal: [
		{
			title: "Documentos",
			icon: IconFileInvoice,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Nota fiscal de produto",
					url: "/nota-fiscal-venda",
					acesso: {
						feature: "notas_fiscais",
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Nota fiscal de serviço",
					url: "/nota-fiscal-servico",
					acesso: {
						modulo: "nfse",
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Nota fiscal de compra",
					url: "/nota-fiscal-compra",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Consulta NFC-e",
					url: "/nfce",
					acesso: {
						feature: "notas_fiscais",
						perfis: [...PERFIS_GESTAO],
					},
				},
				{
					title: "Captura SEFAZ",
					url: "/nota-fiscal-compra/captura-sefaz",
					acesso: {
						perfis: [...PERFIS_GESTAO],
					},
				},
			],
		},
		{
			title: "Regras e tributos",
			icon: IconReceiptTax,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Naturezas",
					url: "/tributos/naturezas",
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
					title: "Regras fiscais",
					url: "/tributos/regras-fiscais",
				},
				{
					title: "Taxas por UF",
					url: "/tributos/taxas",
				},
				{
					title: "Configuração fiscal",
					url: "/tributos/configuracao-fiscal",
				},
			],
		},
	] satisfies NavItem[],

	navContabilidade: [
		{
			title: "Painel",
			icon: IconReportMoney,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Configuração",
					url: "/configuracao-contabilidade",
				},
			],
		},
		{
			title: "Integração",
			icon: IconReportMoney,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Integração contábil",
					url: "/configuracoes?tab=integracoes-contabeis",
				},
				{
					title: "Códigos reduzidos",
					url: "/codigo-reduzidos",
				},
				{
					title: "Plano de contas contábeis",
					url: "/conta-contabil",
				},
			],
		},
		{
			title: "Exportação",
			icon: IconReportMoney,
			acesso: {
				perfis: [...PERFIS_GESTAO],
			},
			items: [
				{
					title: "Gerar SINTEGRA",
					url: "/contabilidade/sintegra",
				},
				{
					title: "Gerar EFD ICMS/IPI",
					url: "/contabilidade/efd",
					acesso: { feature: "sped_efd" },
				},
				{
					title: "Gerar EFD-Contribuições",
					url: "/contabilidade/efd-contribuicoes",
					acesso: { feature: "sped_efd" },
				},
				{
					title: "Apuração EFD",
					url: "/contabilidade/apuracao-efd",
					acesso: { feature: "sped_efd" },
				},
				{
					title: "Exportar XMLs fiscais",
					url: "/contabilidade/exportar-xmls",
				},
			],
		},
	] satisfies NavItem[],

	navSistema: [
		{
			title: "Usuários e permissões",
			url: "/usuarios",
			icon: IconUsers,
			acesso: {
				perfis: [...PERFIS_ADMIN],
			},
		},
		{
			title: "Configurações",
			url: "/configuracoes",
			icon: IconSettings,
		},
		{
			title: "Configurações gerais",
			icon: IconSettings,
			acesso: {
				perfis: [...PERFIS_ADMIN],
			},
			items: [
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
		{
			title: "Agendar tarefas",
			url: "/agendamentos",
			icon: IconSettings,
			acesso: {
				perfis: [...PERFIS_ADMIN],
			},
		},
		{
			title: "Auditoria",
			url: "/auditoria",
			icon: IconHistory,
			acesso: {
				perfis: [...PERFIS_ADMIN],
			},
		},
		{
			title: "Editor SQL",
			url: "/editor-sql",
			icon: IconSettings,
			acesso: {
				perfis: [...PERFIS_ADMIN],
			},
		},
		{
			title: "Ajuda",
			url: "/ajuda",
			icon: IconHelp,
		},
	] satisfies NavItem[],

	/** Rodapé: só para perfil restrito (config/ajuda). Pesquisar fica em navMain. */
	navSecondary: [
		{
			title: "Configurações",
			url: "/configuracoes",
			icon: IconSettings,
		},
		{
			title: "Ajuda",
			url: "/ajuda",
			icon: IconHelp,
		},
	] satisfies NavItem[],
};
