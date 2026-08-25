"use client";

import { useQuery } from "@tanstack/react-query";
import { CotacaoCompraForm } from "../../components/cotacao-form";
import { cotacoesCompraService } from "@/services/cotacoes-compra.service";

export function EditarCotacaoClient({ id }: { id: string }) {
	const { data, isLoading } = useQuery({
		queryKey: ["cotacao-compra", id],
		queryFn: () => cotacoesCompraService.buscar(id),
	});

	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!data) {
		return <p className="py-8 text-center text-muted-foreground">Cotação não encontrada.</p>;
	}

	return (
		<CotacaoCompraForm
			modo="editar"
			cotacaoId={id}
			valoresIniciais={{
				titulo: data.titulo,
				observacao: data.observacao,
				validade: data.validade,
				itens: (data.itens ?? []).map((item) => ({
					idproduto: item.idproduto,
					descricao: item.descricao ?? item.nomeproduto ?? item.descricaoproduto,
					quantidade: item.quantidade,
					unidademedida: item.unidademedida,
					nomeproduto: item.nomeproduto ?? item.descricao ?? undefined,
					codigoproduto: item.codigoproduto,
				})),
			}}
		/>
	);
}
