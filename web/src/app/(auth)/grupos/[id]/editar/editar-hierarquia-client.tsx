"use client";

import { useQuery } from "@tanstack/react-query";
import { hierarquiasService } from "@/services/hierarquias.service";
import type { HierarquiaFormData } from "@/schemas/hierarquia.schema";
import { HierarquiaForm } from "../../components/hierarquia-form";

type EditarHierarquiaClientProps = {
	id: string;
};

function mapHierarquiaToForm(data: Awaited<
	ReturnType<typeof hierarquiasService.buscar>
>): Partial<HierarquiaFormData> {
	return {
		codigo: data.codigo ?? "",
		nome: data.nome ?? "",
		ncm: data.ncm ?? "",
		classe:
			data.classe !== null && data.classe !== undefined
				? (String(data.classe) as HierarquiaFormData["classe"])
				: undefined,
		origem:
			data.origem !== null && data.origem !== undefined
				? (String(data.origem) as HierarquiaFormData["origem"])
				: undefined,
		comissao: data.comissao ?? "",
		enviamobile: data.enviamobile === 1,
		icone: data.icone ?? null,
	};
}

export function EditarHierarquiaClient({ id }: EditarHierarquiaClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["hierarquia", id],
		queryFn: () => hierarquiasService.buscar(id),
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
				<p className="text-muted-foreground">Hierarquia não encontrada.</p>
			</div>
		);
	}

	return (
		<HierarquiaForm
			modo="editar"
			hierarquiaId={id}
			valoresIniciais={mapHierarquiaToForm(data)}
		/>
	);
}
