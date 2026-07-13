"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ProdutoFormData } from "@/schemas/produtos.schema";
import { produtosService } from "@/services/produtos.service";
import { formatarCstProduto } from "@/util/cst-produto-util";
import { ProdutoForm } from "../../components/produto-form";

type EditarProdutoClientProps = {
	id: string;
};

function mapProdutoToForm(
	data: Awaited<ReturnType<typeof produtosService.buscar>>,
): Partial<ProdutoFormData> {
	const tipo = data.tipo?.trim();
	const iat = data.iat?.trim();
	const ippt = data.ippt?.trim();

	return {
		codigo: data.codigo ?? undefined,
		ean: data.ean,
		referencia: data.referencia,
		nome: data.nome,
		idunidademedida: data.idunidademedida ?? "",
		fornecedor: data.fornecedor,
		idgrupo: data.idgrupo ?? "",
		preco: data.preco ?? "",
		custoaquisicao: data.custoaquisicao ?? "",
		tipo: tipo === "P" || tipo === "S" ? tipo : "P",
		iat: iat === "A" || iat === "T" ? iat : null,
		ippt: ippt === "P" || ippt === "T" ? ippt : "P",
		origem: data.origem ?? 0,
		ncm: data.ncm ?? "",
		tipoproduto: data.tipoproduto ?? null,
		idcfopentrada: data.idcfopentrada ?? null,
		idcfopsaida: data.idcfopsaida ?? null,
		idcfopsaidanfce: data.idcfopsaidanfce ?? null,
		idcest: data.idcest ?? null,
		idtaxauf: data.idtaxauf ?? null,
		situacaotributariasnentrada: data.situacaotributariasnentrada ?? null,
		situacaotributaria: data.situacaotributaria ?? null,
		situacaotributariasn: data.situacaotributariasn ?? null,
		tributacaoespecial: data.tributacaoespecial ?? null,
		tributacaosn: data.tributacaosn ?? null,
		cstpisentrada: formatarCstProduto(data.cstpisentrada) || null,
		cstcofinsentrada: formatarCstProduto(data.cstcofinsentrada) || null,
		cstpis: formatarCstProduto(data.cstpis) || null,
		cstcofins: formatarCstProduto(data.cstcofins) || null,
		cstipientrada: data.cstipientrada ?? null,
		cstipisaida: data.cstipisaida ?? null,
		observacoes: data.observacoes,
		enviamobile: data.enviamobile === 1,
		quantidadepadrao: data.quantidadepadrao ?? 0,
		quantidademinima: data.quantidademinima ?? null,
		quantidademaxima: data.quantidademaxima ?? null,
	};
}

export function EditarProdutoClient({ id }: EditarProdutoClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["produto", id],
		queryFn: async () => {
			return await produtosService.buscar(id);
		},
	});

	const valoresIniciais = useMemo(
		() => (data ? mapProdutoToForm(data) : undefined),
		[data],
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!data || !valoresIniciais) {
		return (
			<div className="flex items-center justify-center py-8">
				<p className="text-muted-foreground">Produto não encontrado.</p>
			</div>
		);
	}

	return (
		<ProdutoForm
			key={id}
			modo="editar"
			produtoId={id}
			valoresIniciais={valoresIniciais}
		/>
	);
}
