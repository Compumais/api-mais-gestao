"use client";

import { useQuery } from "@tanstack/react-query";
import { produtosService } from "@/services/produtos.service";
import { ProdutoForm } from "../../components/produto-form";

type EditarProdutoClientProps = {
	id: string;
};

export function EditarProdutoClient({ id }: EditarProdutoClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["produto", id],
		queryFn: async () => {
			return await produtosService.buscar(id);
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
				<p className="text-muted-foreground">Produto não encontrado.</p>
			</div>
		);
	}

	return (
		<ProdutoForm
			modo="editar"
			produtoId={id}
			valoresIniciais={{
				codigo: data.codigo ?? undefined,
				ean: data.ean,
				referencia: data.referencia,
				nome: data.nome,
				idunidademedida: data.idunidademedida ?? "",
				fornecedor: data.fornecedor,
				idgrupo: data.idgrupo ?? "",
				preco: data.preco ?? "",
				tipo: (data.tipo as "P" | "S") ?? "P",
				iat: (data.iat as "A" | "T" | null) ?? null,
				ippt: (data.ippt as "P" | "T") ?? "P",
				origem: data.origem ?? 0,
				ncm: data.ncm ?? "",
				observacoes: data.observacoes,
				enviamobile: data.enviamobile === 1,
			}}
		/>
	);
}
