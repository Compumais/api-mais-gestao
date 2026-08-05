"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { mapProdutoToServicoForm } from "@/schemas/servicos.mapper";
import { produtosService } from "@/services/produtos.service";
import { ServicoForm } from "../../components/servico-form";

type EditarServicoClientProps = {
	id: string;
};

export function EditarServicoClient({ id }: EditarServicoClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["servico", id],
		queryFn: async () => produtosService.buscar(id),
	});

	const valoresIniciais = useMemo(
		() => (data ? mapProdutoToServicoForm(data) : undefined),
		[data],
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!data || data.tipo !== "S" || !valoresIniciais) {
		return (
			<div className="flex items-center justify-center py-8">
				<p className="text-muted-foreground">Serviço não encontrado.</p>
			</div>
		);
	}

	return (
		<ServicoForm
			key={id}
			modo="editar"
			servicoId={id}
			valoresIniciais={valoresIniciais}
		/>
	);
}
