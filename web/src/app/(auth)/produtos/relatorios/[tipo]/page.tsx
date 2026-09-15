import { notFound } from "next/navigation";
import type { TipoRelatorioProduto } from "@/services/relatorios-produtos.service";
import { RELATORIO_PRODUTO_POR_TIPO } from "../relatorios-produtos.config";
import { RelatorioProdutoClient } from "./relatorio-produto-client";

export default async function RelatorioProdutoPage({
	params,
}: {
	params: Promise<{ tipo: string }>;
}) {
	const { tipo } = await params;
	if (!(tipo in RELATORIO_PRODUTO_POR_TIPO)) notFound();

	return <RelatorioProdutoClient tipo={tipo as TipoRelatorioProduto} />;
}
