"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { useEmpresa } from "@/hooks/use-empresa";
import { equipamentoService } from "@/services/equipamento.service";
import { EquipamentoForm } from "../../components/equipamento-form";

export default function EditarEquipamentoPage() {
	const params = useParams<{ id: string }>();
	const { empresa } = useEmpresa();
	const { data, isLoading } = useQuery({
		queryKey: ["equipamento", params.id, empresa?.id],
		enabled: Boolean(params.id && empresa?.id),
		queryFn: () => equipamentoService.buscar(params.id, empresa!.id),
	});

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar equipamento</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				{isLoading && <p>Carregando...</p>}
				{data && <EquipamentoForm modo="editar" equipamento={data} />}
			</div>
		</PageContainer>
	);
}
