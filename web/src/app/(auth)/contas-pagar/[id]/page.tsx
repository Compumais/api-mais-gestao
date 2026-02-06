"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { financeiroService } from "@/services/financeiro.service";

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	const num = parseFloat(value);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
};

const formatDate = (date: string | null | undefined) => {
	if (!date) return "-";
	return dayjs(date).format("DD/MM/YYYY");
};

export default function DetalhesContaPagarPage() {
	const params = useParams();
	const router = useRouter();
	const id = params?.id as string;

	const { data: financeiro, isLoading } = useQuery({
		queryKey: ["financeiro", id],
		queryFn: () => financeiroService.buscar(id),
		enabled: !!id,
	});

	if (isLoading) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-8">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			</PageContainer>
		);
	}

	if (!financeiro) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-8">
					<p className="text-muted-foreground">Conta a pagar não encontrada</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<div className="flex items-center gap-4">
						<Button variant="outline" size="icon" onClick={() => router.back()}>
							<IconArrowLeft className="h-4 w-4" />
						</Button>
						<h1 className="text-2xl font-bold">Detalhes da Conta a Pagar</h1>
					</div>
					<Button onClick={() => router.push(`/contas-pagar/${id}/editar`)}>
						Editar
					</Button>
				</div>
				<div className="rounded-lg border bg-card p-6 mx-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<Label
								htmlFor="documento"
								className="text-sm font-medium text-muted-foreground"
							>
								Documento
							</Label>
							<p className="mt-1 text-sm">{financeiro.documento || "-"}</p>
						</div>
						<div>
							<Label
								htmlFor="status"
								className="text-sm font-medium text-muted-foreground"
							>
								Status
							</Label>
							<p className="mt-1 text-sm">
								{financeiro.status === "A"
									? "Aberto"
									: financeiro.status === "P"
										? "Pago"
										: financeiro.status === "C"
											? "Cancelado"
											: financeiro.status === "V"
												? "Vencido"
												: financeiro.status || "-"}
							</p>
						</div>
						<div>
							<Label
								htmlFor="emissao"
								className="text-sm font-medium text-muted-foreground"
							>
								Emissão
							</Label>
							<p className="mt-1 text-sm">{formatDate(financeiro.emissao)}</p>
						</div>
						<div>
							<Label
								htmlFor="vencimento"
								className="text-sm font-medium text-muted-foreground"
							>
								Vencimento
							</Label>
							<p className="mt-1 text-sm">
								{formatDate(financeiro.vencimento)}
							</p>
						</div>
						<div>
							<Label
								htmlFor="valor"
								className="text-sm font-medium text-muted-foreground"
							>
								Valor
							</Label>
							<p className="mt-1 text-sm font-medium">
								{formatCurrency(financeiro.valor)}
							</p>
						</div>
						<div>
							<Label
								htmlFor="saldo"
								className="text-sm font-medium text-muted-foreground"
							>
								Saldo
							</Label>
							<p className="mt-1 text-sm font-medium">
								{formatCurrency(financeiro.saldo)}
							</p>
						</div>
						{financeiro.entrada && (
							<div>
								<Label
									htmlFor="entrada"
									className="text-sm font-medium text-muted-foreground"
								>
									Entrada
								</Label>
								<p className="mt-1 text-sm">{formatDate(financeiro.entrada)}</p>
							</div>
						)}
						{financeiro.datareferencia && (
							<div>
								<Label
									htmlFor="referencia"
									className="text-sm font-medium text-muted-foreground"
								>
									Referência
								</Label>
								<p className="mt-1 text-sm">
									{formatDate(financeiro.datareferencia)}
								</p>
							</div>
						)}
						{financeiro.pagamento && (
							<div>
								<Label
									htmlFor="pagamento"
									className="text-sm font-medium text-muted-foreground"
								>
									Data de Pagamento
								</Label>
								<p className="mt-1 text-sm">
									{formatDate(financeiro.pagamento)}
								</p>
							</div>
						)}
						{financeiro.historico && (
							<div className="md:col-span-2">
								<Label
									htmlFor="historico"
									className="text-sm font-medium text-muted-foreground"
								>
									Observações
								</Label>
								<p className="mt-1 text-sm whitespace-pre-wrap">
									{financeiro.historico}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</PageContainer>
	);
}
