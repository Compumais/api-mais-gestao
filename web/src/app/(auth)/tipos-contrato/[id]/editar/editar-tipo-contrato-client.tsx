"use client";

import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { TipoContratoForm } from "../../components/tipo-contrato-form";
import { tipoContratoService } from "@/services/tipo-contrato.service";

type Props = {
	id: string;
};

export function EditarTipoContratoClient({ id }: Props) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["tipo-contrato", id],
		queryFn: () => tipoContratoService.buscar(id),
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
				<div className="p-4">Tipo de contrato não encontrado.</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar tipo de contrato</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				<TipoContratoForm
					modo="editar"
					tipoContratoId={data.id}
					valoresIniciais={{
						idgrupocontrato: data.idgrupocontrato ?? "",
						codigo: data.codigo,
						descricao: data.descricao,
						valor: Number(data.valor),
					}}
				/>
			</div>
		</PageContainer>
	);
}
