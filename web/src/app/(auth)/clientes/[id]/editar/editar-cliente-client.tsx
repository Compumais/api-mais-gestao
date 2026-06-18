"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { mapEntidadeToForm } from "@/schemas/entidades.schema";
import { entidadesService } from "@/services/entidades.service";
import { ClientForm } from "../../components/client-form";

type EditarClienteClientProps = {
	id: string;
};

export function EditarClienteClient({ id }: EditarClienteClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["entidade", id],
		queryFn: async () => {
			return await entidadesService.buscar(id);
		},
	});

	const valoresIniciais = useMemo(
		() => (data ? mapEntidadeToForm(data) : undefined),
		[data],
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!data || !valoresIniciais) {
		return (
			<div className="flex items-center justify-center py-8">
				<p className="text-muted-foreground">Cliente não encontrado.</p>
			</div>
		);
	}

	return (
		<ClientForm
			key={`${id}-${data.atualizadoem}`}
			modo="editar"
			entidadeId={id}
			valoresIniciais={valoresIniciais}
		/>
	);
}
