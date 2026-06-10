"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { financeiroService } from "@/services/financeiro.service";
import { IconArrowLeft } from "@tabler/icons-react";

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

export default function DetalhesContaReceberPage() {
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
					<p className="text-muted-foreground">
						Conta a receber não encontrada
					</p>
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
						<h1 className="text-2xl font-bold">Detalhes da Conta a Receber</h1>
					</div>
					<Button onClick={() => router.push(`/contas-receber/${id}/editar`)}>
						Editar
					</Button>
				</div>
				<div className="rounded-lg border bg-card p-6 mx-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Documento
							</label>
							<p className="mt-1 text-sm">{financeiro.documento || "-"}</p>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Status
							</label>
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
							<label className="text-sm font-medium text-muted-foreground">
								Emissão
							</label>
							<p className="mt-1 text-sm">{formatDate(financeiro.emissao)}</p>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Vencimento
							</label>
							<p className="mt-1 text-sm">
								{formatDate(financeiro.vencimento)}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Valor
							</label>
							<p className="mt-1 text-sm font-medium">
								{formatCurrency(financeiro.valor)}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Saldo
							</label>
							<p className="mt-1 text-sm font-medium">
								{formatCurrency(financeiro.saldo)}
							</p>
						</div>
						{financeiro.entrada && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Entrada
								</label>
								<p className="mt-1 text-sm">{formatDate(financeiro.entrada)}</p>
							</div>
						)}
						{financeiro.datareferencia && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Referência
								</label>
								<p className="mt-1 text-sm">
									{formatDate(financeiro.datareferencia)}
								</p>
							</div>
						)}
						{financeiro.baixa && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Data de Baixa
								</label>
								<p className="mt-1 text-sm">{formatDate(financeiro.baixa)}</p>
							</div>
						)}
						{financeiro.historico && (
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-muted-foreground">
									Observações
								</label>
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
