"use client";

import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { FichaProducaoForm } from "../../components/ficha-producao-form";
import { fichaProducaoService } from "@/services/ficha-producao.service";

type EditarFichaProducaoClientProps = {
	id: string;
};

export function EditarFichaProducaoClient({
	id,
}: EditarFichaProducaoClientProps) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["ficha-producao", id],
		queryFn: () => fichaProducaoService.buscar(id),
	});

	if (isLoading) {
		return (
			<PageContainer>
				<div className="p-4 text-sm text-muted-foreground">Carregando...</div>
			</PageContainer>
		);
	}

	if (error || !data) {
		return (
			<PageContainer>
				<div className="p-4 text-sm text-destructive">
					Não foi possível carregar a ficha.
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar ficha de produção</h1>
			</div>
			<div className="mx-4 mb-4 rounded-lg border bg-card p-4">
				<FichaProducaoForm
					modo="editar"
					fichaId={id}
					valoresIniciais={{
						idprodutoacabado: data.idprodutoacabado,
						permiteproducaomassa: data.permiteproducaomassa === 1,
						producaonavenda: data.producaonavenda === 1,
						observacao: data.observacao,
						ativo: data.ativo === 1,
						itens: (data.itens ?? []).map((item) => ({
							idproduto: item.idproduto,
							quantidade: item.quantidade,
							ordem: item.ordem,
						})),
					}}
				/>
			</div>
		</PageContainer>
	);
}
