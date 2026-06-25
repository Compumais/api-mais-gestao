"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CarrinhoVendaRapida } from "@/components/pdv/carrinho-venda-rapida";
import { PagamentoPdvDialog } from "@/components/pdv/pagamento-pdv-dialog";
import { PdvBarraFinalizar } from "@/components/pdv/pdv-barra-finalizar";
import { PdvBuscaProduto } from "@/components/pdv/pdv-busca-produto";
import { PdvGradeProdutos } from "@/components/pdv/pdv-grade-produtos";
import { PdvHeader } from "@/components/pdv/pdv-header";
import { useAuth } from "@/hooks/use-auth";
import { useCaixaPdv } from "@/hooks/use-caixa-pdv";
import { useEmpresa } from "@/hooks/use-empresa";
import { useFecharVenda } from "@/hooks/use-fechar-venda";
import { useNfceAmbientePdv } from "@/hooks/use-nfce-ambiente-pdv";
import { useSaldosEstoque } from "@/hooks/use-saldos-estoque";
import {
	buildContaMesaItemFromProduto,
	buildCupomNfceInfo,
	calcularSubtotalItens,
	type CarrinhoLocalItem,
} from "@/lib/gourmet-utils";
import type { FecharContaFormData } from "@/schemas/fechar-conta.schema";
import { produtosService } from "@/services/produtos.service";
import type { Produto } from "@/services/produtos.service";

export default function PdvPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const editarNfceId = searchParams.get("editarNfce");
	const { user } = useAuth();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { estaAberto } = useCaixaPdv();
	const { fecharVendaRapida } = useFecharVenda();
	const { ambiente: ambienteNfce } = useNfceAmbientePdv();

	const [carrinho, setCarrinho] = useState<CarrinhoLocalItem[]>([]);
	const [pagamentoDialogAberto, setPagamentoDialogAberto] = useState(false);
	const [busca, setBusca] = useState("");

	const { saldoPorCodigo } = useSaldosEstoque(empresa?.id);

	useEffect(() => {
		if (editarNfceId) {
			router.replace(`/nfce/editar?editarNfce=${editarNfceId}`);
		}
	}, [editarNfceId, router]);

	const { data: produtosData, isLoading: isLoadingProdutos } = useQuery({
		queryKey: ["produtos", empresa?.id, { inativo: 0 }],
		queryFn: () =>
			produtosService.listarTodos({
				idempresa: empresa!.id,
				inativo: 0,
			}),
		enabled: !!empresa?.id && !editarNfceId,
	});

	const produtosFiltrados = useMemo(() => {
		const produtos = produtosData ?? [];
		if (!busca.trim()) return produtos;
		const termo = busca.toLowerCase();
		return produtos.filter(
			(p) =>
				p.nome.toLowerCase().includes(termo) ||
				p.codigo?.toString().includes(termo) ||
				p.referencia?.toLowerCase().includes(termo),
		);
	}, [produtosData, busca]);

	const subtotal = calcularSubtotalItens(carrinho);

	const adicionarProduto = useCallback(
		(produto: Produto) => {
			if (!estaAberto) {
				toast.error("Abra o caixa antes de realizar vendas");
				return;
			}

			if (produto.codigo != null) {
				const chave = String(produto.codigo);
				const saldo = saldoPorCodigo[chave];
				if (saldo !== undefined && saldo <= 0) {
					toast.error(`${produto.nome} está sem estoque disponível`);
					return;
				}
			}

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
		},
		[saldoPorCodigo, estaAberto],
	);

	const adicionarPrimeiroMatch = useCallback(() => {
		const primeiro = produtosFiltrados[0];
		if (!primeiro) {
			toast.error("Nenhum produto encontrado para a busca");
			return;
		}
		adicionarProduto(primeiro);
	}, [produtosFiltrados, adicionarProduto]);

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

	const abrirPagamento = useCallback(() => {
		if (!estaAberto) {
			toast.error("Abra o caixa antes de realizar vendas");
			return;
		}
		setPagamentoDialogAberto(true);
	}, [estaAberto]);

	const handleConfirmarVenda = async (pagamento: FecharContaFormData) => {
		if (!estaAberto) {
			throw new Error("Abra o caixa antes de realizar vendas");
		}

		if (!empresa?.id || !user?.id) {
			throw new Error("Empresa ou usuário não selecionado");
		}

		const resultado = await fecharVendaRapida.mutateAsync({
			idempresa: empresa.id,
			userId: user.id,
			itens: carrinho,
			subtotal,
			pagamento,
		});

		return {
			vendaId: resultado.venda.id,
			nfce: buildCupomNfceInfo(resultado.baixa.emissaoNfce, ambienteNfce),
		};
	};

	const handleVendaConcluida = () => {
		setCarrinho([]);
		setBusca("");
	};

	if (editarNfceId) {
		return (
			<>
				<PdvHeader />
				<main className="flex flex-1 items-center justify-center p-8">
					<p className="text-muted-foreground">
						Redirecionando para edição da NFC-e...
					</p>
				</main>
			</>
		);
	}

	return (
		<>
			<PdvHeader voltarHref="/dashboard" voltarLabel="Sistema" />
			<main className="flex min-h-0 flex-1 flex-col pb-20 lg:pb-0">
				<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
					<div className="flex min-h-0 flex-1 flex-col lg:w-3/5">
						<PdvBuscaProduto
							value={busca}
							onChange={setBusca}
							onEnter={adicionarPrimeiroMatch}
						/>
						<PdvGradeProdutos
							produtos={produtosFiltrados}
							isLoading={isLoadingProdutos}
							onAdicionar={adicionarProduto}
							saldoPorCodigo={saldoPorCodigo}
						/>
					</div>
					<div className="max-h-64 min-h-48 shrink-0 lg:max-h-none lg:min-h-0 lg:w-2/5">
						<CarrinhoVendaRapida
							itens={carrinho}
							onAtualizarQuantidade={atualizarQuantidade}
							onRemover={removerItem}
							onFinalizar={abrirPagamento}
							ocultarRodape
						/>
					</div>
				</div>
				<PdvBarraFinalizar
					total={subtotal}
					qtdItens={carrinho.length}
					onLimpar={() => setCarrinho([])}
					onFinalizar={abrirPagamento}
					desabilitado={!estaAberto}
				/>
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
