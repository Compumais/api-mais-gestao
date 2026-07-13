"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cfopService } from "@/services/cfop.service";
import { NaturezaForm } from "../../components/natureza-form";

type EditarNaturezaClientProps = {
	id: string;
};

export function EditarNaturezaClient({ id }: EditarNaturezaClientProps) {
	const router = useRouter();

	const { data, isLoading, isError } = useQuery({
		queryKey: ["cfop", id],
		queryFn: () => cfopService.buscar(id),
	});

	if (isLoading) {
		return (
			<section className="px-4">
				<div className="flex items-center justify-center py-8">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			</section>
		);
	}

	if (isError || !data) {
		router.replace("/tributos/naturezas");
		return null;
	}

	return (
		<section className="px-4">
			<h1 className="mb-4 text-2xl font-bold">Editar natureza</h1>
			<div className="rounded-lg border bg-card p-4">
				<NaturezaForm
					modo="editar"
					naturezaId={id}
					valoresIniciais={{
						codigo: data.codigo ?? "",
						descricao: data.descricao ?? "",
						tipoproduto: data.tipoproduto ?? null,
					}}
				/>
			</div>
		</section>
	);
}
