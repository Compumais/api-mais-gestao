"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import {
	isUnidadeMedidaGlobal,
	unidadeMedidaService,
} from "@/services/unidade-medida.service";
import { UnidadeMedidaForm } from "../../components/unidade-medida-form";

type EditarUnidadeMedidaClientProps = {
	id: string;
};

export function EditarUnidadeMedidaClient({ id }: EditarUnidadeMedidaClientProps) {
	const router = useRouter();

	const { data, isLoading } = useQuery({
		queryKey: ["unidade-medida", id],
		queryFn: async () => {
			return await unidadeMedidaService.buscar(id);
		},
	});

	useEffect(() => {
		if (!data) return;
		if (!isUnidadeMedidaGlobal(data)) return;

		toast.error("Unidades globais do sistema não podem ser editadas.");
		router.replace("/unidade-medida");
	}, [data, router]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!data || isUnidadeMedidaGlobal(data)) {
		return (
			<div className="flex items-center justify-center py-8">
				<p className="text-muted-foreground">
					Unidade de medida não encontrada.
				</p>
			</div>
		);
	}

	return (
		<UnidadeMedidaForm
			modo="editar"
			unidadeMedidaId={id}
			valoresIniciais={{
				nome: data.nome ?? "",
				codigo: data.codigo ?? "",
			}}
		/>
	);
}
