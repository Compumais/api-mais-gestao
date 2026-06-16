"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ComandaSheet } from "../../components/comanda-sheet";
import { GarcomHeader } from "../../components/garcom-header";
import { ProdutoCardsGrupo } from "../../components/produto-cards-grupo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProdutosGarcom } from "@/hooks/use-produtos-garcom";
import { useSaldosEstoque } from "@/hooks/use-saldos-estoque";
import {
	buildContaMesaItemFromProduto,
	calcularTotalContaMesaItens,
	formatCurrency,
	STATUS_MESA,
} from "@/lib/gourmet-utils";
import { contaMesaItemService } from "@/services/conta-mesa-item.service";
import type { ContaMesaItem } from "@/services/conta-mesa-item.service";
import { contaMesaService } from "@/services/conta-mesa.service";
import type { Produto } from "@/services/produtos.service";

export default function GarcomComandaPage() {
	const params = useParams<{ id: string }>();
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { saldoPorCodigo } = useSaldosEstoque(empresa?.id);
	const { produtosPorGrupo, isLoading: isLoadingProdutos } = useProdutosGarcom(
		empresa?.id,
	);

	const [comandaAberta, setComandaAberta] = useState(false);
	const contaId = params.id;

	const { data: conta, isLoading: isLoadingConta } = useQuery({
		queryKey: ["conta-mesa", contaId],
		queryFn: () => contaMesaService.buscar(contaId),
		enabled: !!contaId,
	});

	const { data: itensData, isLoading: isLoadingItens } = useQuery({
		queryKey: ["conta-mesa-itens", contaId],
		queryFn: () =>
			contaMesaItemService.listar({ idcontamesa: contaId, limit: 100 }),
		enabled: !!contaId,
	});

	const itens = itensData?.data ?? [];
	const subtotal = calcularTotalContaMesaItens(itens);

	const { mutate: adicionarItem, isPending: isAdding } = useMutation({
		mutationFn: async (produto: Produto) => {
			if (!user?.id || !contaId) {
				throw new Error("Dados incompletos para adicionar item");
			}

			if (produto.codigo != null) {
				const chave = String(produto.codigo);
				const saldo = saldoPorCodigo[chave];
				if (saldo !== undefined && saldo <= 0) {
					throw new Error(`${produto.nome} está sem estoque disponível`);
				}
			}

			return contaMesaItemService.criar(
				buildContaMesaItemFromProduto({
					produto,
					idcontamesa: contaId,
					idgarcom: user.id,
				}),
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["conta-mesa-itens", contaId],
			});
			toast.success("Item adicionado");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao adicionar item");
		},
	});

	const { mutate: atualizarItem, isPending: isUpdating } = useMutation({
		mutationFn: async ({
			item,
			novaQuantidade,
		}: {
			item: ContaMesaItem;
			novaQuantidade: number;
		}) => {
			return contaMesaItemService.atualizar(item.id, {
				quantidade: novaQuantidade.toFixed(3),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["conta-mesa-itens", contaId],
			});
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar item");
		},
	});

	const { mutate: removerItem } = useMutation({
		mutationFn: (itemId: string) => contaMesaItemService.deletar(itemId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["conta-mesa-itens", contaId],
			});
			toast.success("Item removido");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao remover item");
		},
	});

	if (isLoadingConta) {
		return (
			<>
				<GarcomHeader titulo="Carregando..." voltarHref="/garcom" voltarLabel="Mesas" />
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground">Carregando comanda...</p>
				</div>
			</>
		);
	}

	if (!conta) {
		return (
			<>
				<GarcomHeader titulo="Comanda" voltarHref="/garcom" voltarLabel="Mesas" />
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground">Comanda não encontrada</p>
				</div>
			</>
		);
	}

	if (conta.status !== STATUS_MESA.ABERTO) {
		return (
			<>
				<GarcomHeader
					titulo={`Mesa ${conta.numeromesa}`}
					voltarHref="/garcom"
					voltarLabel="Mesas"
				/>
				<div className="flex flex-1 items-center justify-center p-6 text-center">
					<p className="text-muted-foreground">
						Esta mesa/comanda não está mais aberta.
					</p>
				</div>
			</>
		);
	}

	return (
		<>
			<GarcomHeader
				titulo={`Mesa ${conta.numeromesa}`}
				voltarHref="/garcom"
				voltarLabel="Mesas"
			/>

			<main className="relative flex min-h-0 flex-1 flex-col">
				<ProdutoCardsGrupo
					produtosPorGrupo={produtosPorGrupo}
					isLoading={isLoadingProdutos}
					onAdicionar={(produto) => adicionarItem(produto)}
					isAdding={isAdding}
					saldoPorCodigo={saldoPorCodigo}
				/>

				<div className="fixed right-0 bottom-0 left-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
					<Button
						size="lg"
						variant="secondary"
						className="h-12 w-full justify-between text-base"
						onClick={() => setComandaAberta(true)}
					>
						<span>
							Comanda ({itens.length})
						</span>
						<span className="font-bold text-primary">
							{formatCurrency(subtotal)}
						</span>
					</Button>
				</div>
			</main>

			<ComandaSheet
				open={comandaAberta}
				onOpenChange={setComandaAberta}
				itens={itens}
				isLoading={isLoadingItens}
				numeromesa={conta.numeromesa}
				onAtualizarQuantidade={(item, qty) =>
					atualizarItem({ item, novaQuantidade: qty })
				}
				onRemover={(id) => removerItem(id)}
				isUpdating={isUpdating || isAdding}
			/>
		</>
	);
}
