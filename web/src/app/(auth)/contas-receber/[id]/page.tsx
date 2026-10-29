"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { FinanceiroDetalheResumo } from "@/app/(auth)/components/financeiro-detalhe-resumo";
import { FinanceiroDetalheTimeline } from "@/app/(auth)/components/financeiro-detalhe-timeline";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { useTituloAba } from "@/hooks/use-titulo-aba";
import { financeiroService } from "@/services/financeiro.service";

export default function DetalhesContaReceberPage() {
	const params = useParams();
	const router = useRouter();
	const id = params?.id as string;

	const { data: financeiro, isLoading } = useQuery({
		queryKey: ["financeiro", id],
		queryFn: () => financeiroService.buscar(id),
		enabled: !!id,
	});

	useTituloAba(financeiro?.historico ?? financeiro?.documento ?? undefined);

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

				<div className="mx-4 flex flex-col gap-4">
					<FinanceiroDetalheResumo
						financeiro={financeiro}
						variante="receber"
					/>
					<FinanceiroDetalheTimeline financeiro={financeiro} />
				</div>
			</div>
		</PageContainer>
	);
}
