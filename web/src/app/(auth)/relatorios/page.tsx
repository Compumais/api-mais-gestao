"use client";

import {
	IconAlertTriangle,
	IconArrowsLeftRight,
	IconBuildingBank,
	IconCashBanknoteMinus,
	IconCashBanknotePlus,
	IconChartDonut,
	IconChartLine,
	IconChartPie,
	IconCreditCard,
	IconFileAnalytics,
	IconFileInvoice,
	IconListDetails,
	IconPackage,
	IconReceiptTax,
	IconShoppingCart,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ContasPagarReportDialog } from "@/components/contas-pagar-report-dialog";
import { ContasReceberReportDialog } from "@/components/contas-receber-report-dialog";
import { DespesasPorCategoriaReportDialog } from "@/components/despesas-por-categoria-report-dialog";
import { DreGerencialReportDialog } from "@/components/dre-gerencial-report-dialog";
import { FluxoCaixaReportDialog } from "@/components/fluxo-caixa-report-dialog";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type DialogoRelatorio =
	| "dre"
	| "despesas"
	| "fluxo-caixa"
	| "contas-pagar"
	| "contas-receber";

type ModuloRelatorio = "Produtos" | "Estoque" | "Financeiro" | "Fiscal";

type RelatorioHub = {
	modulo: ModuloRelatorio;
	title: string;
	description: string;
	icon: typeof IconFileAnalytics;
	href: string;
	color: string;
	premium?: boolean;
	dialogo?: DialogoRelatorio;
};

const MODULOS: ModuloRelatorio[] = [
	"Produtos",
	"Estoque",
	"Financeiro",
	"Fiscal",
];

const reports: RelatorioHub[] = [
	{
		modulo: "Produtos",
		title: "Relatórios de produtos",
		description:
			"Qualidade do cadastro, preços, comercial, compras e demais relatórios do catálogo.",
		icon: IconListDetails,
		href: "/produtos/relatorios",
		color: "text-sky-600",
	},
	{
		modulo: "Estoque",
		title: "Posição de estoque",
		description: "Saldo, rupturas e produtos sem movimentação.",
		icon: IconPackage,
		href: "/produtos/relatorios/estoque",
		color: "text-teal-600",
	},
	{
		modulo: "Estoque",
		title: "Inventário de estoque",
		description:
			"Listagem para conferência física e valoração do saldo operacional e fiscal.",
		icon: IconPackage,
		href: "/produtos/relatorios/inventario",
		color: "text-teal-600",
	},
	{
		modulo: "Estoque",
		title: "Movimentações de produtos",
		description: "Kardex consolidado com entradas e saídas de estoque.",
		icon: IconArrowsLeftRight,
		href: "/produtos/relatorios/movimentacoes",
		color: "text-teal-600",
	},
	{
		modulo: "Financeiro",
		title: "DRE Gerencial",
		description: "Demonstração do Resultado do Exercício detalhado.",
		icon: IconFileAnalytics,
		href: "/relatorios?abrir=dre",
		color: "text-purple-500",
		dialogo: "dre",
	},
	{
		modulo: "Financeiro",
		title: "Despesas por Categoria",
		description: "Análise das despesas categorizadas pelo plano de contas.",
		icon: IconChartPie,
		href: "/relatorios?abrir=despesas",
		color: "text-orange-500",
		dialogo: "despesas",
	},
	{
		modulo: "Financeiro",
		title: "Receita por Categoria",
		description: "Análise gráfica das receitas categorizadas.",
		icon: IconChartDonut,
		href: "#",
		color: "text-emerald-500",
		premium: true,
	},
	{
		modulo: "Financeiro",
		title: "Inadimplência",
		description: "Controle de clientes inadimplentes e atrasos.",
		icon: IconAlertTriangle,
		href: "#",
		color: "text-rose-500",
		premium: true,
	},
	{
		modulo: "Financeiro",
		title: "Centro de Custos",
		description: "Relatórios segregados por centros de custo.",
		icon: IconBuildingBank,
		href: "#",
		color: "text-indigo-500",
		premium: true,
	},
	{
		modulo: "Financeiro",
		title: "Formas de Pagamento",
		description: "Análise de lucratividade por forma de pagamento.",
		icon: IconCreditCard,
		href: "#",
		color: "text-cyan-500",
		premium: true,
	},
	{
		modulo: "Financeiro",
		title: "Fluxo de Caixa",
		description: "Acompanhe as entradas e saídas de recursos financeiros.",
		icon: IconChartLine,
		href: "/relatorios?abrir=fluxo-caixa",
		color: "text-blue-500",
		dialogo: "fluxo-caixa",
	},
	{
		modulo: "Financeiro",
		title: "Contas a Pagar",
		description: "Visualize suas obrigações financeiras futuras e pendentes.",
		icon: IconCashBanknoteMinus,
		href: "/relatorios?abrir=contas-pagar",
		color: "text-red-500",
		dialogo: "contas-pagar",
	},
	{
		modulo: "Financeiro",
		title: "Contas a Receber",
		description: "Monitore os valores a receber de clientes e vendas.",
		icon: IconCashBanknotePlus,
		href: "/relatorios?abrir=contas-receber",
		color: "text-green-500",
		dialogo: "contas-receber",
	},
	{
		modulo: "Fiscal",
		title: "Relatórios fiscais",
		description:
			"Consolidado de NF-e de compra, NF-e de venda e NFC-e autorizadas no período.",
		icon: IconReceiptTax,
		href: "/relatorios/fiscais",
		color: "text-amber-600",
	},
	{
		modulo: "Fiscal",
		title: "Relatório de compras",
		description:
			"Notas fiscais de entrada confirmadas no período, com os produtos de cada documento.",
		icon: IconShoppingCart,
		href: "/relatorios/fiscais/compras",
		color: "text-sky-600",
	},
	{
		modulo: "Fiscal",
		title: "Relatório de vendas",
		description:
			"NF-e de saída e NFC-e autorizadas no período, com os produtos de cada documento.",
		icon: IconFileInvoice,
		href: "/relatorios/fiscais/vendas",
		color: "text-violet-600",
	},
];

function abrirDialogo(valor: string | null): DialogoRelatorio | null {
	if (
		valor === "dre" ||
		valor === "despesas" ||
		valor === "fluxo-caixa" ||
		valor === "contas-pagar" ||
		valor === "contas-receber"
	) {
		return valor;
	}
	return null;
}

export default function RelatoriosPage() {
	const searchParams = useSearchParams();
	const [dialogoAberto, setDialogoAberto] = useState<DialogoRelatorio | null>(
		null,
	);

	useEffect(() => {
		setDialogoAberto(abrirDialogo(searchParams.get("abrir")));
	}, [searchParams]);

	const grupos = useMemo(
		() =>
			MODULOS.map((modulo) => ({
				modulo,
				items: reports.filter((report) => report.modulo === modulo),
			})).filter((grupo) => grupo.items.length > 0),
		[],
	);

	const abrir = (dialogo: DialogoRelatorio) => setDialogoAberto(dialogo);
	const fechar = () => setDialogoAberto(null);

	return (
		<div className="space-y-8 p-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
				<p className="text-muted-foreground">
					Relatórios centralizados por módulo: produtos, estoque, financeiro e
					fiscal.
				</p>
			</div>

			{grupos.map((grupo) => (
				<section key={grupo.modulo} className="space-y-4">
					<div>
						<h2 className="text-lg font-semibold tracking-tight">
							{grupo.modulo}
						</h2>
						<Separator className="mt-2" />
					</div>

					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{grupo.items.map((report) => {
							const CardContent = (
								<Card className="h-full transition-all duration-200 hover:border-primary hover:shadow-md">
									<CardHeader>
										<div className="flex items-center gap-4">
											<div
												className={`rounded-lg bg-muted p-2 transition-colors ${report.color}`}
											>
												<report.icon className="h-6 w-6" />
											</div>
											<div className="flex-1">
												<CardTitle className="text-lg transition-colors">
													{report.title}
												</CardTitle>
											</div>
										</div>
										<CardDescription className="mt-2 pt-2">
											{report.description}
										</CardDescription>
									</CardHeader>
								</Card>
							);

							if (report.dialogo) {
								return (
									<button
										key={report.title}
										type="button"
										className="group w-full cursor-pointer border-0 bg-transparent p-0 text-left"
										onClick={() => {
											abrir(report.dialogo);
										}}
									>
										{CardContent}
									</button>
								);
							}

							if (report.href === "#") {
								return (
									<div key={report.title} className="opacity-70">
										{CardContent}
									</div>
								);
							}

							return (
								<Link href={report.href} key={report.title} className="group">
									{CardContent}
								</Link>
							);
						})}
					</div>
				</section>
			))}

			<FluxoCaixaReportDialog
				open={dialogoAberto === "fluxo-caixa"}
				onOpenChange={(open) => {
					if (open) abrir("fluxo-caixa");
					else fechar();
				}}
			/>
			<ContasPagarReportDialog
				open={dialogoAberto === "contas-pagar"}
				onOpenChange={(open) => {
					if (open) abrir("contas-pagar");
					else fechar();
				}}
			/>
			<ContasReceberReportDialog
				open={dialogoAberto === "contas-receber"}
				onOpenChange={(open) => {
					if (open) abrir("contas-receber");
					else fechar();
				}}
			/>
			<DespesasPorCategoriaReportDialog
				open={dialogoAberto === "despesas"}
				onOpenChange={(open) => {
					if (open) abrir("despesas");
					else fechar();
				}}
			/>
			<DreGerencialReportDialog
				open={dialogoAberto === "dre"}
				onOpenChange={(open) => {
					if (open) abrir("dre");
					else fechar();
				}}
			/>
		</div>
	);
}
