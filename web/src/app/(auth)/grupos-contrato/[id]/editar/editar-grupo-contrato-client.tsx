"use client";

import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { GrupoContratoForm } from "../../components/grupo-contrato-form";
import { grupoContratoService } from "@/services/grupo-contrato.service";

export function EditarGrupoContratoClient({ id }: { id: string }) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["grupo-contrato", id],
		queryFn: () => grupoContratoService.buscar(id),
	});

	if (isLoading) {
		return (
			<PageContainer>
				<div className="p-4">Carregando...</div>
			</PageContainer>
		);
	}

	if (error || !data) {
		return (
			<PageContainer>
				<div className="p-4">Grupo não encontrado.</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar grupo de contrato</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				<GrupoContratoForm
					modo="editar"
					grupoContratoId={data.id}
					valoresIniciais={{
						codigo: data.codigo,
						descricao: data.descricao,
					}}
				/>
			</div>
		</PageContainer>
	);
}
