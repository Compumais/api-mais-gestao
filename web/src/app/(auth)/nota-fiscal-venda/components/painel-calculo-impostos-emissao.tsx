"use client";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { TotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe";

type PainelCalculoImpostosEmissaoProps = {
	totaisFiscais: TotaisFiscaisEmissaoNfe;
};

const formatarMoeda = (valor: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);

type CampoTotal = {
	label: string;
	valor: number;
};

export function PainelCalculoImpostosEmissao({
	totaisFiscais,
}: PainelCalculoImpostosEmissaoProps) {
	const campos: CampoTotal[] = [
		{ label: "BC ICMS", valor: totaisFiscais.baseIcms },
		{ label: "Valor ICMS", valor: totaisFiscais.valorIcms },
		{ label: "BC ICMS ST", valor: totaisFiscais.baseIcmsSt },
		{ label: "Valor ICMS ST", valor: totaisFiscais.valorIcmsSt },
		{ label: "ICMS Desonerado", valor: totaisFiscais.valorIcmsDesonerado },
		{ label: "Desconto", valor: totaisFiscais.desconto },
		{ label: "Total Produtos", valor: totaisFiscais.totalProdutos },
		{ label: "Frete", valor: totaisFiscais.frete },
		{ label: "Seguro", valor: totaisFiscais.seguro },
		{ label: "Despesas", valor: totaisFiscais.outrasDespesas },
		{ label: "Valor IPI", valor: totaisFiscais.valorIpi },
		{ label: "IPI Devolvido", valor: totaisFiscais.valorIpiDevol },
		{ label: "BC ISS", valor: totaisFiscais.baseIss },
		{ label: "Valor ISS", valor: totaisFiscais.valorIss },
		{ label: "Total Serviços", valor: totaisFiscais.totalServicos },
		{ label: "Valor FCP ST", valor: totaisFiscais.valorFcpSt },
		{ label: "FCP ST Ret.", valor: totaisFiscais.valorFcpStRet },
		{ label: "ICMS mono ret.", valor: totaisFiscais.valorIcmsMonoRet },
		{ label: "ICMS mono reten.", valor: totaisFiscais.valorIcmsMonoReten },
		{ label: "Valor PIS", valor: totaisFiscais.valorPis },
		{ label: "Valor COFINS", valor: totaisFiscais.valorCofins },
	];

	return (
		<Collapsible defaultOpen className="rounded-lg border">
			<CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors">
				<span className="text-sm font-semibold text-red-600">
					Cálculo dos Impostos
				</span>
				<ChevronDown className="h-4 w-4 text-muted-foreground" />
			</CollapsibleTrigger>
			<CollapsibleContent className="px-4 pb-4">
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
					{campos.map((campo) => (
						<div key={campo.label} className="space-y-0.5">
							<span className="text-xs text-muted-foreground block">
								{campo.label}
							</span>
							<span className="font-medium tabular-nums">
								{formatarMoeda(campo.valor)}
							</span>
						</div>
					))}
				</div>
				<div className="mt-4 flex items-center justify-between rounded-md bg-muted/50 border px-4 py-3">
					<span className="text-sm font-medium">Total da Nota</span>
					<span className="text-lg font-semibold tabular-nums">
						{formatarMoeda(totaisFiscais.totalNota)}
					</span>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
