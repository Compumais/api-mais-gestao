"use client";

import { useQuery } from "@tanstack/react-query";
import type { GrupoGourmetFormData } from "@/schemas/grupo-gourmet.schema";
import { gruposGourmetService } from "@/services/grupos-gourmet.service";
import { GrupoGourmetForm } from "../../components/grupo-gourmet-form";

type EditarGrupoGourmetClientProps = {
	id: string;
};

export function EditarGrupoGourmetClient({ id }: EditarGrupoGourmetClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["grupo-gourmet", id],
		queryFn: () => gruposGourmetService.buscar(id),
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
				<p className="text-muted-foreground">Grupo gourmet não encontrado.</p>
			</div>
		);
	}

	const valoresIniciais: Partial<GrupoGourmetFormData> = {
		codigo: data.codigo ?? "",
		nome: data.nome,
	};

	return (
		<GrupoGourmetForm
			modo="editar"
			grupoId={id}
			valoresIniciais={valoresIniciais}
		/>
	);
}
