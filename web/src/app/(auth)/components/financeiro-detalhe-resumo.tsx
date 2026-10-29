"use client";

import type { ReactNode } from "react";
import { getStatusBadge } from "@/app/(auth)/components/financeiro-lista-colunas";
import { formatDataCivilBrasilia } from "@/lib/date";
import type { Financeiro } from "@/services/financeiro.service";

function formatarMoeda(valor: string | null | undefined) {
	const num = Number.parseFloat(valor || "0") || 0;
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

type Campo = {
	label: string;
	valor: ReactNode;
	largo?: boolean;
};

type FinanceiroDetalheResumoProps = {
	financeiro: Financeiro;
	variante: "pagar" | "receber";
};

export function FinanceiroDetalheResumo({
	financeiro,
	variante,
}: FinanceiroDetalheResumoProps) {
	const parcela =
		financeiro.parcela != null
			? financeiro.totalparcelas && financeiro.totalparcelas > 1
				? `${financeiro.parcela}/${financeiro.totalparcelas}`
				: String(financeiro.parcela)
			: "-";

	const campos: Campo[] = [
		{ label: "Documento", valor: financeiro.documento || "-" },
		{ label: "Nome", valor: financeiro.emitente || "-" },
		{ label: "Parcela", valor: parcela },
		{
			label: "Status",
			valor: getStatusBadge(financeiro.status, financeiro),
		},
		{
			label: "Emissão",
			valor: formatDataCivilBrasilia(financeiro.emissao),
		},
		{
			label: "Vencimento",
			valor: formatDataCivilBrasilia(financeiro.vencimento),
		},
		{ label: "Valor", valor: formatarMoeda(financeiro.valor) },
		{ label: "Saldo", valor: formatarMoeda(financeiro.saldo) },
		{
			label: variante === "receber" ? "Valor recebido" : "Valor pago",
			valor: formatarMoeda(financeiro.valorpagorecebido),
		},
	];

	if (financeiro.pagamento) {
		campos.push({
			label: "Último pagamento",
			valor: formatDataCivilBrasilia(financeiro.pagamento),
		});
	}
	if (financeiro.baixa) {
		campos.push({
			label: "Data de baixa",
			valor: formatDataCivilBrasilia(financeiro.baixa),
		});
	}
	if (financeiro.historico) {
		campos.push({
			label: "Observações",
			valor: (
				<span className="whitespace-pre-wrap">{financeiro.historico}</span>
			),
			largo: true,
		});
	}

	return (
		<section className="rounded-lg border bg-card p-6">
			<div className="mb-4">
				<h2 className="text-base font-semibold">Resumo</h2>
				<p className="text-sm text-muted-foreground">
					Situação atual do título
					{variante === "pagar" ? " a pagar" : " a receber"}.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{campos.map((campo) => (
					<div
						key={campo.label}
						className={campo.largo ? "md:col-span-2 lg:col-span-3" : undefined}
					>
						<p className="text-sm font-medium text-muted-foreground">
							{campo.label}
						</p>
						<div className="mt-1 text-sm">{campo.valor}</div>
					</div>
				))}
			</div>
		</section>
	);
}
