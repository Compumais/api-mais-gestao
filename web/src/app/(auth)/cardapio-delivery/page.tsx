"use client";

import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { useEmpresa } from "@/hooks/use-empresa";
import { cardapioDeliveryService } from "@/services/cardapio-delivery.service";
import { CardapioDeliveryForm } from "./cardapio-delivery-form";

export default function CardapioDeliveryPage() {
	const { empresa } = useEmpresa();
	const { data, isLoading, error } = useQuery({
		queryKey: ["cardapio-delivery", empresa?.id],
		queryFn: () => cardapioDeliveryService.buscar(empresa?.id ?? ""),
		enabled: Boolean(empresa?.id),
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-2 px-4 pt-4">
				<h1 className="text-2xl font-semibold">Cardápio delivery</h1>
				<p className="text-sm text-muted-foreground">
					Configure o cardápio público de delivery. Os pedidos entram no PDV e
					são impressos na cozinha.
				</p>
			</div>
			{!empresa ? (
				<p className="px-4 py-8 text-muted-foreground">
					Selecione uma empresa para configurar o cardápio.
				</p>
			) : isLoading ? (
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			) : error || !data ? (
				<p className="px-4 py-8 text-muted-foreground">
					Não foi possível carregar o cardápio.
				</p>
			) : (
				<CardapioDeliveryForm inicial={data} />
			)}
		</PageContainer>
	);
}
