"use client";

import { useQuery } from "@tanstack/react-query";
import { unidadeMedidaService } from "@/services/unidade-medida.service";
import { UnidadeMedidaForm } from "../../components/unidade-medida-form";

type EditarUnidadeMedidaClientProps = {
	id: string;
};

export function EditarUnidadeMedidaClient({ id }: EditarUnidadeMedidaClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["unidade-medida", id],
		queryFn: async () => {
			return await unidadeMedidaService.buscar(id);
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex items-center justify-center py-8">
				<p className="text-muted-foreground">
					Unidade de medida não encontrada.
				</p>
			</div>
		);
	}

	return (
		<UnidadeMedidaForm
			modo="editar"
			unidadeMedidaId={id}
			valoresIniciais={{
				nome: data.nome ?? "",
				codigo: data.codigo ?? "",
			}}
		/>
	);
}
