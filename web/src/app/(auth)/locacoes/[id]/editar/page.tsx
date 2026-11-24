"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/hooks/use-empresa";
import { locacaoService } from "@/services/locacao.service";
import { LocacaoForm } from "../../components/locacao-form";

export default function EditarLocacaoPage() {
	const params = useParams<{ id: string }>();
	const { empresa } = useEmpresa();
	const { data, isLoading } = useQuery({
		queryKey: ["locacao", params.id, empresa?.id],
		enabled: Boolean(params.id && empresa?.id),
		queryFn: () => locacaoService.buscar(params.id, empresa!.id),
	});

	return (
		<PageContainer>
			<div className="p-4">
				<h1 className="text-2xl font-bold">Editar locação</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				{isLoading && <p>Carregando...</p>}
				{data?.situacao === "aberta" && (
					<LocacaoForm modo="editar" locacao={data} />
				)}
				{data && data.situacao !== "aberta" && (
					<div className="grid gap-3">
						<p>
							Esta locação já foi{" "}
							{data.situacao === "fechada" ? "fechada" : "cancelada"}.
						</p>
						<Button asChild className="w-fit">
							<Link href={`/locacoes/${data.id}`}>Ver locação</Link>
						</Button>
					</div>
				)}
			</div>
		</PageContainer>
	);
}
