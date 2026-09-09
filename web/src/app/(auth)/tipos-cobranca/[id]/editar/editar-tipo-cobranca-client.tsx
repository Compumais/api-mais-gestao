"use client";

import { useQuery } from "@tanstack/react-query";
import { tipoCobrancaService } from "@/services/tipo-cobranca.service";
import { TipoCobrancaForm } from "../../components/tipo-cobranca-form";

type EditarTipoCobrancaClientProps = {
	id: string;
};

export function EditarTipoCobrancaClient({
	id,
}: EditarTipoCobrancaClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["tipo-cobranca", id],
		queryFn: async () => {
			return await tipoCobrancaService.buscar(id);
		},
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
				<p className="text-muted-foreground">
					Tipo de cobrança não encontrado.
				</p>
			</div>
		);
	}

	return (
		<TipoCobrancaForm
			modo="editar"
			tipoCobrancaId={id}
			valoresIniciais={{
				codigo: data.codigo,
				descricao: data.descricao,
				idtipodocumentofinanceiro: data.idtipodocumentofinanceiro,
			}}
		/>
	);
}
