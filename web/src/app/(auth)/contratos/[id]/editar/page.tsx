"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { useEmpresa } from "@/hooks/use-empresa";
import { contratoService } from "@/services/contrato.service";
import { ContratoForm } from "../../components/contrato-form";

export default function EditarContratoPage() {
	const params = useParams<{ id: string }>();
	const { empresa } = useEmpresa();

	const { data, isLoading } = useQuery({
		queryKey: ["contrato", params.id, empresa?.id],
		enabled: Boolean(params.id && empresa?.id),
		queryFn: () => contratoService.buscar(params.id, empresa!.id),
	});

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar contrato</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				{isLoading && <p>Carregando...</p>}
				{data && <ContratoForm modo="editar" contrato={data} />}
			</div>
		</PageContainer>
	);
}
