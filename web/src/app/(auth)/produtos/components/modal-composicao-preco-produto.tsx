"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ModalComposicaoPreco } from "@/components/composicao-preco/modal-composicao-preco";
import {
	estadoComposicaoPadrao,
	type BasePrecoComposicao,
	type EstadoComposicaoPreco,
} from "@/components/composicao-preco/tipos";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	type EntradaHistoricoComposicao,
	custoProdutoService,
} from "@/services/custo-produto.service";
import {
	type Produto,
	produtosService,
} from "@/services/produtos.service";
import { parseNumeroComposicao } from "@/util/calcular-composicao-preco";

type ModalComposicaoPrecoProdutoProps = {
	produto: Pick<Produto, "id" | "nome" | "preco" | "custoaquisicao">;
	idempresa: string;
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
};

function montarEstadoInicialProduto(
	produtoDetalhe: Produto,
	ultimoCusto: EntradaHistoricoComposicao | null,
): EstadoComposicaoPreco {
	const temST = parseNumeroComposicao(ultimoCusto?.icmsst) > 0;

	return estadoComposicaoPadrao({
		basePrecoId: "custoaquisicao",
		desconto: ultimoCusto?.desconto ?? "0",
		freteSeguroDespesas: ultimoCusto?.fretesegurooutrasdesp ?? "0",
		icmsst: ultimoCusto?.icmsst ?? "0",
		percentualDiferencialIcms: temST
			? "0"
			: (produtoDetalhe.aliquotaicmsdiferencialentrada ?? "0"),
		percentualIcmsCredito: produtoDetalhe.aliquotaicmsinterna ?? "0",
		percentualIcmsSaida: produtoDetalhe.aliquotaicmsinterna ?? "0",
		percentualComissao: produtoDetalhe.comissao ?? "0",
	});
}

export function ModalComposicaoPrecoProduto({
	produto,
	idempresa,
	aberto,
	onAbertoChange,
}: ModalComposicaoPrecoProdutoProps) {
	const queryClient = useQueryClient();

	const { data: produtoDetalhe, isLoading: carregandoProduto } = useQuery({
		queryKey: ["produto-composicao", produto.id],
		queryFn: () => produtosService.buscar(produto.id),
		enabled: aberto,
	});

	const { data: historicoData, isLoading: carregandoHistorico } = useQuery({
		queryKey: ["ultima-composicao-produto", produto.id],
		queryFn: () =>
			custoProdutoService.listarHistoricoComposicao({
				idproduto: produto.id,
				page: 1,
				limit: 1,
			}),
		enabled: aberto,
	});

	const ultimoCusto = historicoData?.data[0] ?? null;
	const detalhe = produtoDetalhe;
	const carregando = carregandoProduto || carregandoHistorico;
	const pronto = aberto && !carregando && !!detalhe;

	const estadoInicial = useMemo(() => {
		if (!detalhe) {
			return estadoComposicaoPadrao({ basePrecoId: "custoaquisicao" });
		}
		return montarEstadoInicialProduto(detalhe, ultimoCusto);
	}, [detalhe, ultimoCusto]);

	const basesPreco = useMemo((): BasePrecoComposicao[] => {
		const bases: BasePrecoComposicao[] = [
			{
				id: "custoaquisicao",
				label: "Custo de aquisição",
				valor: detalhe?.custoaquisicao ?? produto.custoaquisicao,
			},
		];

		if (ultimoCusto?.precocompra) {
			bases.push({
				id: "ultimacompra",
				label: "Última compra",
				valor: ultimoCusto.precocompra,
			});
		}

		return bases;
	}, [detalhe?.custoaquisicao, produto.custoaquisicao, ultimoCusto?.precocompra]);

	const temST = parseNumeroComposicao(ultimoCusto?.icmsst) > 0;

	const handleAplicar = useCallback(
		async (novoPreco: string) => {
			await produtosService.atualizar(
				produto.id,
				{ preco: novoPreco },
				idempresa,
			);
			await queryClient.invalidateQueries({ queryKey: ["produtos"] });
			await queryClient.invalidateQueries({
				queryKey: ["produto-composicao", produto.id],
			});
		},
		[idempresa, produto.id, queryClient],
	);

	if (!aberto) {
		return null;
	}

	if (!pronto || !detalhe) {
		return (
			<Dialog open={aberto} onOpenChange={onAbertoChange}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Composição de preço</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						Carregando dados de {produto.nome}...
					</p>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<ModalComposicaoPreco
			aberto={aberto}
			onAbertoChange={onAbertoChange}
			nomeProduto={detalhe.nome}
			idproduto={detalhe.id}
			origemCusto="Cadastro"
			basesPreco={basesPreco}
			precoVendaAtual={detalhe.preco}
			estadoInicial={estadoInicial}
			temST={temST}
			valorIpi={ultimoCusto?.ipi}
			custoUltimaCompraFallback={
				ultimoCusto?.precocompra ?? detalhe.custoaquisicao
			}
			resetKey={produto.id}
			onAplicar={handleAplicar}
		/>
	);
}
