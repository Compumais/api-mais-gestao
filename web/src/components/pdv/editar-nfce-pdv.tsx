"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AbrirCaixaDialog } from "@/app/(gourmet)/gourmet/components/abrir-caixa-dialog";
import { CarrinhoVendaRapida } from "@/app/(gourmet)/gourmet/components/carrinho-venda-rapida";
import { PagamentoPdvDialog } from "@/app/(gourmet)/gourmet/components/pagamento-pdv-dialog";
import { ProdutoTabela } from "@/app/(gourmet)/gourmet/components/produto-tabela";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	NFE_AMBIENTE_LABELS,
	obterLabelStatus,
} from "@/constants/nfe-status";
import { useAuth } from "@/hooks/use-auth";
import { useCaixaPdv } from "@/hooks/use-caixa-pdv";
import { useEmpresa } from "@/hooks/use-empresa";
import { useNfceAmbientePdv } from "@/hooks/use-nfce-ambiente-pdv";
import { useSaldosEstoque } from "@/hooks/use-saldos-estoque";
import {
	avaliarResultadoBaixaEstoque,
	obterMotivoFalhaNfceResultado,
} from "@/lib/avaliar-resultado-baixa-estoque";
import {
	buildContaMesaItemFromProduto,
	buildCupomNfceInfo,
	calcularSubtotalItens,
	type CarrinhoLocalItem,
	vendaPagamentosToFecharContaForm,
} from "@/lib/gourmet-utils";
import type { FecharContaFormData } from "@/schemas/fechar-conta.schema";
import { nfceService } from "@/services/nfce.service";
import { produtosService, type Produto } from "@/services/produtos.service";

export function EditarNfcePdv() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const editarNfceId = searchParams.get("editarNfce");
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const { empresa } = useEmpresa();
	const { estaAberto } = useCaixaPdv();
	const { ambiente: ambienteNfce } = useNfceAmbientePdv();

	const [carrinho, setCarrinho] = useState<CarrinhoLocalItem[]>([]);
	const [pagamentoDialogAberto, setPagamentoDialogAberto] = useState(false);
	const [carrinhoCarregado, setCarrinhoCarregado] = useState(false);
	const [abrirCaixaDialog, setAbrirCaixaDialog] = useState(false);

	const { saldoPorCodigo } = useSaldosEstoque(empresa?.id);

	const {
		data: dadosEdicao,
		isLoading: carregandoEdicao,
		isError: erroEdicao,
		error: erroEdicaoDetalhe,
		refetch: recarregarEdicao,
	} = useQuery({
		queryKey: ["nfce-editar", editarNfceId, empresa?.id],
		queryFn: () =>
			nfceService.buscarParaEditar({
				idempresa: empresa!.id,
				idnotafiscal: editarNfceId!,
			}),
		enabled:
			!!editarNfceId && !!empresa?.id && isAuthenticated && !authLoading,
		retry: 1,
	});

	const atualizarNfceMutation = useMutation({
		mutationFn: (params: {
			idnotafiscal: string;
			itens: CarrinhoLocalItem[];
			pagamento: FecharContaFormData;
		}) =>
			nfceService.atualizarVenda({
				idempresa: empresa!.id,
				idnotafiscal: params.idnotafiscal,
				itens: params.itens,
				pagamento: params.pagamento,
			}),
	});

	const { data: produtosData, isLoading: isLoadingProdutos } = useQuery({
		queryKey: ["produtos", empresa?.id, { inativo: 0 }],
		queryFn: () =>
			produtosService.listarTodos({
				idempresa: empresa!.id,
				inativo: 0,
			}),
		enabled: !!empresa?.id && isAuthenticated && !authLoading,
	});

	useEffect(() => {
		if (!editarNfceId) {
			router.replace("/nfce");
		}
	}, [editarNfceId, router]);

	useEffect(() => {
		if (!dadosEdicao || carrinhoCarregado) return;

		setCarrinho(
			dadosEdicao.itens.map((item) => ({
				idproduto: item.idproduto,
				nomeproduto: item.nomeproduto,
				quantidade: item.quantidade,
				precounitario: item.precounitario,
				unidademedida: item.unidademedida ?? "",
				codigo: item.codigo,
			})),
		);
		setCarrinhoCarregado(true);
	}, [carrinhoCarregado, dadosEdicao]);

	const pagamentoInicial = useMemo(
		() =>
			dadosEdicao
				? vendaPagamentosToFecharContaForm(dadosEdicao.venda)
				: undefined,
		[dadosEdicao],
	);

	const subtotal = calcularSubtotalItens(carrinho);

	const adicionarProduto = (produto: Produto) => {
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
	};

	const atualizarQuantidade = (index: number, qty: number) => {
		setCarrinho((prev) => {
			const updated = [...prev];
			updated[index] = {
				...updated[index],
				quantidade: qty.toFixed(3),
			};
			return updated;
		});
	};

	const removerItem = (index: number) => {
		setCarrinho((prev) => prev.filter((_, i) => i !== index));
	};

	const handleConfirmarVenda = async (pagamento: FecharContaFormData) => {
		if (!estaAberto) {
			throw new Error("Abra o caixa antes de realizar vendas");
		}

		if (!empresa?.id || !editarNfceId) {
			throw new Error("Empresa ou NFC-e não informada");
		}

		const resultado = await atualizarNfceMutation.mutateAsync({
			idnotafiscal: editarNfceId,
			itens: carrinho,
			pagamento,
		});

		const avaliacao = avaliarResultadoBaixaEstoque({
			movimentosRegistrados: resultado.movimentosRegistrados,
			deveEmitirNfce: true,
			meiosUtilizados: [],
			avisos: resultado.avisos,
			emissaoNfce: resultado.emissaoNfce,
		});

		if (resultado.emissaoNfce?.emitida) {
			toast.success("NFC-e atualizada e autorizada!");
		} else if (avaliacao.falhaNfce) {
			toast.error(
				`NFC-e não autorizada: ${obterMotivoFalhaNfceResultado({
					emissaoNfce: resultado.emissaoNfce,
					avisos: resultado.avisos,
					movimentosRegistrados: resultado.movimentosRegistrados,
					deveEmitirNfce: true,
					meiosUtilizados: [],
				})}`,
			);
		} else {
			toast.success("Venda atualizada. Retransmita a NFC-e se necessário.");
		}

		for (const aviso of avaliacao.falhasEstoque) {
			toast.error(aviso);
		}
		for (const aviso of avaliacao.outrosAvisos) {
			toast.warning(aviso);
		}

		return {
			vendaId: resultado.idvenda,
			nfce: buildCupomNfceInfo(resultado.emissaoNfce, ambienteNfce),
		};
	};

	const numeroNfce =
		dadosEdicao?.nota.numeronotafiscal && dadosEdicao.nota.serie
			? `${dadosEdicao.nota.numeronotafiscal}/${dadosEdicao.nota.serie}`
			: dadosEdicao?.nota.numeronotafiscal ?? "—";

	if (!editarNfceId) {
		return null;
	}

	if (
		authLoading ||
		carregandoEdicao ||
		(!carrinhoCarregado && !erroEdicao)
	) {
		return (
			<div className="flex flex-1 items-center justify-center p-8">
				<p className="text-muted-foreground">Carregando NFC-e para edição...</p>
			</div>
		);
	}

	if (erroEdicao) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
				<p className="text-destructive">
					{erroEdicaoDetalhe instanceof Error
						? erroEdicaoDetalhe.message
						: "Não foi possível carregar a NFC-e para edição"}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" onClick={() => recarregarEdicao()}>
						Tentar novamente
					</Button>
					<Button type="button" asChild>
						<Link href="/nfce">Voltar para NFC-e</Link>
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 py-4">
			<div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold">Editar NFC-e</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Ajuste itens e pagamentos antes de reemitir o cupom
					</p>
				</div>
				<Button type="button" variant="outline" asChild>
					<Link href="/nfce">Voltar</Link>
				</Button>
			</div>

			{dadosEdicao && (
				<div className="mx-4 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-4 py-2 text-sm">
					<Badge variant="outline">Nº {numeroNfce}</Badge>
					<Badge variant="outline">
						{obterLabelStatus(dadosEdicao.nota.status)}
					</Badge>
					{dadosEdicao.nota.tipoambientenfe != null && (
						<Badge variant="outline">
							{NFE_AMBIENTE_LABELS[dadosEdicao.nota.tipoambientenfe] ??
								dadosEdicao.nota.tipoambientenfe}
						</Badge>
					)}
					{dadosEdicao.nota.chavenfe && (
						<span className="font-mono text-xs text-muted-foreground">
							Chave: {dadosEdicao.nota.chavenfe}
						</span>
					)}
					{dadosEdicao.nota.mensagemtransmissaonfe && (
						<span className="text-xs text-destructive">
							{dadosEdicao.nota.mensagemtransmissaonfe}
						</span>
					)}
				</div>
			)}

			{!estaAberto && (
				<div className="mx-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
					<p>Abra o caixa PDV para editar e reemitir esta NFC-e.</p>
					<Button
						type="button"
						size="sm"
						onClick={() => setAbrirCaixaDialog(true)}
					>
						Abrir caixa
					</Button>
				</div>
			)}

			<div className="mx-4 flex min-h-[60vh] flex-col overflow-hidden rounded-md border lg:flex-row">
				<div className="min-h-0 flex-1 lg:w-3/5">
					<ProdutoTabela
						produtos={produtosData ?? []}
						isLoading={isLoadingProdutos}
						onAdicionar={adicionarProduto}
						saldoPorCodigo={saldoPorCodigo}
					/>
				</div>
				<div className="min-h-0 lg:w-2/5">
					<CarrinhoVendaRapida
						itens={carrinho}
						onAtualizarQuantidade={atualizarQuantidade}
						onRemover={removerItem}
						onFinalizar={() => {
							if (!estaAberto) {
								toast.error("Abra o caixa antes de realizar vendas");
								return;
							}
							setPagamentoDialogAberto(true);
						}}
					/>
				</div>
			</div>

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
				contexto={`Editar NFC-e nº ${numeroNfce}`}
				titulo="Reemitir NFC-e"
				pagamentoInicial={pagamentoInicial}
				onConfirmarVenda={handleConfirmarVenda}
				onVendaConcluida={() => router.push("/nfce")}
				isPending={atualizarNfceMutation.isPending}
			/>

			<AbrirCaixaDialog
				open={abrirCaixaDialog}
				onOpenChange={setAbrirCaixaDialog}
			/>
		</div>
	);
}
