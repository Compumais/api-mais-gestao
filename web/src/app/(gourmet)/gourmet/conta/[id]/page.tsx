"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CarrinhoComanda } from "../../components/carrinho-comanda";
import { PagamentoPdvDialog } from "../../components/pagamento-pdv-dialog";
import { ProdutoTabela } from "../../components/produto-tabela";
import { PdvHeader } from "../../components/pdv-header";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { useFecharVenda } from "@/hooks/use-fechar-venda";
import {
	buildContaMesaItemFromProduto,
	calcularTotalContaMesaItens,
	STATUS_MESA,
} from "@/lib/gourmet-utils";
import type { FecharContaFormData } from "@/schemas/fechar-conta.schema";
import { contaMesaItemService } from "@/services/conta-mesa-item.service";
import type { ContaMesaItem } from "@/services/conta-mesa-item.service";
import { contaMesaService } from "@/services/conta-mesa.service";
import { produtosService } from "@/services/produtos.service";
import type { Produto } from "@/services/produtos.service";

export default function ContaMesaPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { fecharConta } = useFecharVenda();

	const [pagamentoDialogAberto, setPagamentoDialogAberto] = useState(false);
	const [cancelarDialogAberto, setCancelarDialogAberto] = useState(false);

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

	const { data: produtosData, isLoading: isLoadingProdutos } = useQuery({
		queryKey: ["produtos", empresa?.id, { inativo: 0 }],
		queryFn: () =>
			produtosService.listar({
				idempresa: empresa!.id,
				inativo: 0,
				limit: 100,
			}),
		enabled: !!empresa?.id,
	});

	const itens = itensData?.data ?? [];
	const subtotal = calcularTotalContaMesaItens(itens);

	const { mutate: adicionarItem, isPending: isAdding } = useMutation({
		mutationFn: async (produto: Produto) => {
			if (!user?.id || !contaId) {
				throw new Error("Dados incompletos para adicionar item");
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

	const { mutate: cancelarMesa, isPending: isCancelando } = useMutation({
		mutationFn: () =>
			contaMesaService.atualizar(contaId, {
				status: STATUS_MESA.CANCELADO,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["contas-mesa"] });
			toast.success("Mesa cancelada");
			router.push("/gourmet");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cancelar mesa");
		},
	});

	const handleConfirmarVenda = async (pagamento: FecharContaFormData) => {
		if (!empresa?.id || !user?.id) {
			throw new Error("Empresa ou usuário não selecionado");
		}

		const venda = await fecharConta.mutateAsync({
			idempresa: empresa.id,
			userId: user.id,
			idcontamesa: contaId,
			itens,
			subtotal,
			pagamento,
		});

		return { vendaId: venda.id };
	};

	const handleVendaConcluida = () => {
		router.push("/gourmet");
	};

	if (isLoadingConta) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<p className="text-muted-foreground">Carregando comanda...</p>
			</div>
		);
	}

	if (!conta) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">Comanda não encontrada</p>
			</div>
		);
	}

	if (conta.status !== STATUS_MESA.ABERTO) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">
					Esta mesa não está mais aberta.
				</p>
			</div>
		);
	}

	return (
		<>
			<PdvHeader
				titulo={`Mesa ${conta.numeromesa}`}
				voltarHref="/gourmet"
				voltarLabel="Mesas"
			/>
			<main className="flex min-h-0 flex-1 flex-col lg:flex-row">
				<div className="min-h-0 flex-1 lg:w-3/5">
					<ProdutoTabela
						produtos={produtosData?.data ?? []}
						isLoading={isLoadingProdutos}
						onAdicionar={(produto) => adicionarItem(produto)}
						isAdding={isAdding}
					/>
				</div>
				<div className="min-h-0 lg:w-2/5">
					<CarrinhoComanda
						itens={itens}
						isLoading={isLoadingItens}
						numeromesa={conta.numeromesa}
						onAtualizarQuantidade={(item, qty) =>
							atualizarItem({ item, novaQuantidade: qty })
						}
						onRemover={(id) => removerItem(id)}
						onFecharConta={() => setPagamentoDialogAberto(true)}
						onCancelarMesa={() => setCancelarDialogAberto(true)}
						isUpdating={isUpdating || isAdding || fecharConta.isPending}
					/>
				</div>
			</main>

			<PagamentoPdvDialog
				open={pagamentoDialogAberto}
				onOpenChange={setPagamentoDialogAberto}
				subtotal={subtotal}
				itens={itens.map((item) => ({
					nome: item.nomeproduto,
					quantidade: item.quantidade,
					precounitario: item.precounitario,
				}))}
				empresaNome={empresa?.nome ?? "Empresa"}
				contexto={`Mesa ${conta.numeromesa}`}
				titulo="Fechar conta"
				onConfirmarVenda={handleConfirmarVenda}
				onVendaConcluida={handleVendaConcluida}
				isPending={fecharConta.isPending}
			/>

			<AlertDialog
				open={cancelarDialogAberto}
				onOpenChange={setCancelarDialogAberto}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancelar mesa?</AlertDialogTitle>
						<AlertDialogDescription>
							A mesa {conta.numeromesa} será cancelada. Os itens da comanda
							serão mantidos no histórico.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Voltar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => cancelarMesa()}
							disabled={isCancelando}
						>
							{isCancelando ? "Cancelando..." : "Confirmar cancelamento"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
