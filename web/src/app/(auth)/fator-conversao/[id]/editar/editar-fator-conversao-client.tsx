"use client";

import { useQuery } from "@tanstack/react-query";
import { FatorConversaoForm } from "../../components/fator-conversao-form";
import { fatorConversaoService } from "@/services/fator-conversao.service";

type EditarFatorConversaoClientProps = {
	id: string;
};

export function EditarFatorConversaoClient({ id }: EditarFatorConversaoClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["fator-conversao", id],
		queryFn: () => fatorConversaoService.buscar(id),
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
				<p className="text-muted-foreground">Fator de conversão não encontrado.</p>
			</div>
		);
	}

	return (
		<FatorConversaoForm
			modo="editar"
			fatorConversaoId={id}
			valoresIniciais={{
				nome: data.nome,
				fator: data.fator,
			}}
		/>
	);
}
