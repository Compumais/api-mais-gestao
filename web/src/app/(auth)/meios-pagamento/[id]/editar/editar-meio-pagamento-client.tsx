"use client";

import { useQuery } from "@tanstack/react-query";
import { ESCOPO_CONDICAO_PAGAMENTO } from "@/schemas/condicao-pagamento.schema";
import { condicaoPagamentoService } from "@/services/condicao-pagamento.service";
import { MeioPagamentoForm } from "../../components/meio-pagamento-form";

type EditarMeioPagamentoClientProps = {
	id: string;
};

export function EditarMeioPagamentoClient({ id }: EditarMeioPagamentoClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["meio-pagamento", id],
		queryFn: async () => {
			return await condicaoPagamentoService.buscar(id);
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
				<p className="text-muted-foreground">Meio de pagamento não encontrado.</p>
			</div>
		);
	}

	return (
		<MeioPagamentoForm
			modo="editar"
			condicaoPagamentoId={id}
			valoresIniciais={{
				codigo: data.codigo ?? "",
				descricao: data.descricao ?? "",
				parcelas: data.parcelas ?? 1,
				prazos: data.prazos ?? "0",
				escopo: data.escopo ?? ESCOPO_CONDICAO_PAGAMENTO.COMPRA_E_VENDA,
				inativo: data.inativo === 1,
			}}
		/>
	);
}
