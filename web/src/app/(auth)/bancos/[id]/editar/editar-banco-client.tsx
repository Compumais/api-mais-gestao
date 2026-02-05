"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bancosService } from "@/services/bancos.service";
import { isBancoPadrao } from "@/util/bancos-padrao";
import { BancoForm } from "../../components/banco-form";

type EditarBancoClientProps = {
	id: string;
};

export function EditarBancoClient({ id }: EditarBancoClientProps) {
	const router = useRouter();

	const { data, isLoading } = useQuery({
		queryKey: ["banco", id],
		queryFn: async () => {
			return await bancosService.buscar(id);
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
				<p className="text-muted-foreground">Banco não encontrado.</p>
			</div>
		);
	}

	const isPadrao = isBancoPadrao(data);

	if (isPadrao) {
		toast.error("Bancos padrão não podem ser editados");
		router.push("/bancos");
		return null;
	}

	return (
		<BancoForm
			modo="editar"
			bancoId={id}
			valoresIniciais={{
				codigo: data.codigo,
				nome: data.nome,
			}}
		/>
	);
}
