"use client";

import { useQuery } from "@tanstack/react-query";
import { tipoProblemaService } from "@/services/tipo-problema.service";
import { TipoProblemaForm } from "../../components/tipo-problema-form";

type EditarTipoProblemaClientProps = {
	id: string;
};

export function EditarTipoProblemaClient({
	id,
}: EditarTipoProblemaClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["tipo-problema", id],
		queryFn: async () => {
			return await tipoProblemaService.buscar(id);
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
					Tipo de problema não encontrado.
				</p>
			</div>
		);
	}

	return (
		<TipoProblemaForm
			modo="editar"
			tipoProblemaId={id}
			valoresIniciais={{
				codigo: data.codigo ?? "",
				descricao: data.descricao ?? "",
				inativo: data.inativo === 1,
			}}
		/>
	);
}
