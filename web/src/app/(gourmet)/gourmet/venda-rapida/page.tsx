"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CarrinhoVendaRapida } from "../components/carrinho-venda-rapida";
import { PagamentoPdvDialog } from "../components/pagamento-pdv-dialog";
import { ProdutoTabela } from "../components/produto-tabela";
import { PdvHeader } from "../components/pdv-header";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { useFecharVenda } from "@/hooks/use-fechar-venda";
import {
	buildContaMesaItemFromProduto,
	calcularSubtotalItens,
	type CarrinhoLocalItem,
} from "@/lib/gourmet-utils";
import type { FecharContaFormData } from "@/schemas/fechar-conta.schema";
import { produtosService } from "@/services/produtos.service";
import type { Produto } from "@/services/produtos.service";
import { toast } from "sonner";

export default function VendaRapidaPage() {
	const router = useRouter();
	const { user } = useAuth();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { fecharVendaRapida } = useFecharVenda();

	const [carrinho, setCarrinho] = useState<CarrinhoLocalItem[]>([]);
	const [pagamentoDialogAberto, setPagamentoDialogAberto] = useState(false);

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

	const subtotal = calcularSubtotalItens(carrinho);

	const adicionarProduto = useCallback((produto: Produto) => {
		try {
			const itemBase = buildContaMesaItemFromProduto({
				produto,
				idcontamesa: "local",
				idgarcom: "local",
			});

			setCarrinho((prev) => {
				const existente = prev.findIndex((i) => i.idproduto === produto.id);
				if (existente >= 0) {
					const updated = [...prev];
					const qty = Number.parseFloat(updated[existente].quantidade) + 1;
					updated[existente] = {
						...updated[existente],
						quantidade: qty.toFixed(3),
					};
					return updated;
				}
				return [
					...prev,
					{
						idproduto: itemBase.idproduto,
						nomeproduto: itemBase.nomeproduto,
						quantidade: itemBase.quantidade,
						precounitario: itemBase.precounitario,
						unidademedida: itemBase.unidademedida,
						codigo: produto.codigo,
					},
				];
			});
			toast.success("Item adicionado");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Erro ao adicionar item",
			);
		}
	}, []);

	const atualizarQuantidade = useCallback((index: number, qty: number) => {
		setCarrinho((prev) => {
			const updated = [...prev];
			updated[index] = {
				...updated[index],
				quantidade: qty.toFixed(3),
			};
			return updated;
		});
	}, []);

	const removerItem = useCallback((index: number) => {
		setCarrinho((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleConfirmarVenda = async (pagamento: FecharContaFormData) => {
		if (!empresa?.id || !user?.id) {
			throw new Error("Empresa ou usuário não selecionado");
		}

		const venda = await fecharVendaRapida.mutateAsync({
			idempresa: empresa.id,
			userId: user.id,
			itens: carrinho,
			subtotal,
			pagamento,
		});

		return { vendaId: venda.id };
	};

	const handleVendaConcluida = () => {
		setCarrinho([]);
		router.push("/gourmet");
	};

	return (
		<>
			<PdvHeader
				titulo="Venda rápida"
				voltarHref="/gourmet"
				voltarLabel="Mesas"
			/>
			<main className="flex min-h-0 flex-1 flex-col lg:flex-row">
				<div className="min-h-0 flex-1 lg:w-3/5">
					<ProdutoTabela
						produtos={produtosData?.data ?? []}
						isLoading={isLoadingProdutos}
						onAdicionar={adicionarProduto}
					/>
				</div>
				<div className="min-h-0 lg:w-2/5">
					<CarrinhoVendaRapida
						itens={carrinho}
						onAtualizarQuantidade={atualizarQuantidade}
						onRemover={removerItem}
						onFinalizar={() => setPagamentoDialogAberto(true)}
					/>
				</div>
			</main>

			<PagamentoPdvDialog
				open={pagamentoDialogAberto}
				onOpenChange={setPagamentoDialogAberto}
				subtotal={subtotal}
				itens={carrinho.map((item) => ({
					codigo: item.codigo,
					nome: item.nomeproduto,
					quantidade: item.quantidade,
					precounitario: item.precounitario,
				}))}
				empresaNome={empresa?.nome ?? "Empresa"}
				contexto="Venda rápida — Balcão"
				titulo="Finalizar venda"
				onConfirmarVenda={handleConfirmarVenda}
				onVendaConcluida={handleVendaConcluida}
				isPending={fecharVendaRapida.isPending}
			/>
		</>
	);
}
