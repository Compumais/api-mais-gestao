"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { contasCorrentesService } from "@/services/contas-correntes.service";
import { ContaCorrenteForm } from "../../components/conta-corrente-form";

type EditarContaCorrenteClientProps = {
	id: string;
};

export function EditarContaCorrenteClient({
	id,
}: EditarContaCorrenteClientProps) {
	const router = useRouter();

	const { data, isLoading } = useQuery({
		queryKey: ["conta-corrente", id],
		queryFn: async () => {
			return await contasCorrentesService.buscar(id);
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
				<p className="text-muted-foreground">Conta corrente não encontrada.</p>
			</div>
		);
	}

	return (
		<ContaCorrenteForm
			modo="editar"
			contaCorrenteId={id}
			valoresIniciais={{
				descricao: data.descricao || "",
				agencia: data.agencia || "",
				numeroconta: data.numeroconta || "",
				abertura: data.abertura || "",
				observacao: data.observacao || "",
				nometitular: data.nometitular || "",
				cnpjcpftitular: data.cnpjcpftitular || "",
				gerente: data.gerente || "",
				telefonegerente: data.telefonegerente || "",
				codigo: data.codigo || undefined,
				idbanco: data.idbanco || undefined,
			}}
		/>
	);
}
