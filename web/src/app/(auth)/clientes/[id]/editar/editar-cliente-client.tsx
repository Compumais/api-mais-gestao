"use client";

import { useQuery } from "@tanstack/react-query";
import { entidadesService } from "@/services/entidades.service";
import { ClientForm } from "../../components/client-form";

type EditarClienteClientProps = {
	id: string;
};

export function EditarClienteClient({ id }: EditarClienteClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["entidade", id],
		queryFn: async () => {
			return await entidadesService.buscar(id);
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
				<p className="text-muted-foreground">Cliente não encontrado.</p>
			</div>
		);
	}

	return (
		<ClientForm
			modo="editar"
			entidadeId={id}
			valoresIniciais={{
				idempresa: data.idempresa,
				nome: data.nome,
				cnpjcpf: data.cnpjcpf,
				razaosocial: data.razaosocial,
				tipopessoa: data.tipopessoa,
				inscricaoestadual: data.inscricaoestadual,
				rg: data.rg,
				email: data.email,
				telefone: data.telefone,
				endereco: data.endereco,
				numeroendereco: data.numeroendereco,
				complemento: data.complemento,
				bairro: data.bairro,
				idcidade: data.idcidade,
				idestado: data.idestado,
				cep: data.cep,
				fax: data.fax,
				nascimento: data.nascimento,
				idplanocontas: data.idplanocontas,
				pais: data.pais,
			}}
		/>
	);
}
