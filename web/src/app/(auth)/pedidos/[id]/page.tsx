"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	ExternalLink,
	Pencil,
	Plus,
	Save,
	Send,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { MoneyInput } from "@/components/ui/money-input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { useEmpresa } from "@/hooks/use-empresa";
import { pedidoPodeFaturarNfe } from "@/constants/dav-status";
import { entidadesService } from "@/services/entidades.service";
import {
	davService,
	type PedidoDavItem,
} from "@/services/dav.service";
import { produtosService } from "@/services/produtos.service";
import { CamposIntegracaoNfVenda } from "@/app/(auth)/nota-fiscal-venda/components/campos-integracao-nf-venda";
import { PageContainer } from "../../components/page-container";
import { ModalItemPedido } from "../components/modal-item-pedido";

const formatarMoeda = (valor: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);

function calcularTotalItens(itens: PedidoDavItem[]) {
	return itens.reduce((acc, item) => {
		const qtd = parseFloat(item.quantidade ?? "0");
		const preco = parseFloat(item.preco ?? "0");
		const total = parseFloat(item.total ?? "0");
		if (Number.isFinite(total) && total > 0) return acc + total;
		if (Number.isFinite(qtd) && Number.isFinite(preco)) return acc + qtd * preco;
		return acc;
	}, 0);
}

export default function PedidoDetalhePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const [idcliente, setIdcliente] = useState("");
	const [idtipodocumento, setIdtipodocumento] = useState("");
	const [idcondicaopagto, setIdcondicaopagto] = useState("");
	const [idplanocontas, setIdplanocontas] = useState("");
	const [idlocalestoque, setIdlocalestoque] = useState("");
	const [desconto, setDesconto] = useState("0");
	const [observacao, setObservacao] = useState("");

	const [modalItemAberto, setModalItemAberto] = useState(false);
	const [itemEditando, setItemEditando] = useState<PedidoDavItem | null>(null);
	const [indoParaEmissao, setIndoParaEmissao] = useState(false);

	const { data: pedido, isLoading: carregandoPedido } = useQuery({
		queryKey: ["pedido", id],
		queryFn: () => davService.buscar(id),
		enabled: !!id,
	});

	const { data: itens = [], isLoading: carregandoItens } = useQuery({
		queryKey: ["pedido-itens", id],
		queryFn: () => davService.listarItens(id),
		enabled: !!id,
	});

	const { data: entidadesLista } = useQuery({
		queryKey: ["entidades-pedido", empresa?.id],
		queryFn: () =>
			entidadesService.listarTodos({
				idempresa: empresa?.id ?? "",
			}),
		enabled: !!empresa?.id,
	});

	const { data: produtosLista } = useQuery({
		queryKey: ["produtos-pedido-detalhe", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return produtosService.listarTodos({ idempresa: empresa.id, inativo: 0 });
		},
		enabled: !!empresa?.id,
	});

	useEffect(() => {
		if (!pedido) return;
		setIdcliente(pedido.idcliente ?? "");
		setIdtipodocumento(pedido.idtipodocumentofinanceiro ?? "");
		setIdcondicaopagto(pedido.idcondicaopagamento ?? "");
		setIdlocalestoque(pedido.idlocalestoque ?? "");
		setDesconto(pedido.descontosubtotal ?? pedido.desconto ?? "0");
		setObservacao(pedido.observacao ?? "");
	}, [pedido]);

	const totalItens = useMemo(() => calcularTotalItens(itens), [itens]);
	const mapaProdutos = useMemo(() => {
		const mapa = new Map<string, string>();
		for (const produto of produtosLista ?? []) {
			mapa.set(
				produto.id,
				produto.descricao?.trim() || produto.nome || String(produto.codigo ?? ""),
			);
		}
		return mapa;
	}, [produtosLista]);
	const descontoNumero = parseFloat(desconto.replace(",", ".")) || 0;
	const totalPedido = Math.max(totalItens - descontoNumero, 0);
	const pedidoFaturado = !!pedido?.idnotafiscal;
	const podeFaturar =
		!!pedido &&
		pedidoPodeFaturarNfe(pedido) &&
		itens.length > 0 &&
		!!idcliente &&
		!!idcondicaopagto &&
		!!idtipodocumento;

	const { mutate: salvarPedido, isPending: salvandoPedido } = useMutation({
		mutationFn: async () => {
			const cliente = entidadesLista?.find((item) => item.id === idcliente);
			return davService.atualizar(id, {
				idcliente: idcliente || undefined,
				nomecliente:
					cliente?.razaosocial?.trim() ||
					cliente?.nome?.trim() ||
					undefined,
				cnpjcpfcliente: cliente?.cnpjcpf ?? undefined,
				idtipodocumentofinanceiro: idtipodocumento || undefined,
				idcondicaopagamento: idcondicaopagto || undefined,
				idlocalestoque: idlocalestoque || undefined,
				descontosubtotal: descontoNumero > 0 ? descontoNumero.toFixed(2) : "0",
				valor: totalPedido.toFixed(2),
				observacao: observacao.trim() || undefined,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pedido", id] });
			void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
			toast.success("Pedido salvo");
		},
		onError: (erro) => {
			toast.error("Erro ao salvar pedido", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: salvarItem, isPending: salvandoItem } = useMutation({
		mutationFn: async (dados: {
			idproduto: string;
			quantidade: string;
			preco: string;
		}) => {
			if (itemEditando) {
				return davService.atualizarItem(id, itemEditando.id, dados);
			}
			return davService.criarItem(id, dados);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pedido-itens", id] });
			void queryClient.invalidateQueries({ queryKey: ["pedido", id] });
			setModalItemAberto(false);
			setItemEditando(null);
			toast.success(itemEditando ? "Item atualizado" : "Item adicionado");
		},
		onError: (erro) => {
			toast.error("Erro ao salvar item", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: excluirItem, isPending: excluindoItem } = useMutation({
		mutationFn: (iditem: string) => davService.excluirItem(id, iditem),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pedido-itens", id] });
			toast.success("Item removido");
		},
		onError: (erro) => {
			toast.error("Erro ao remover item", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	async function salvarPedidoAsync() {
		const cliente = entidadesLista?.find((item) => item.id === idcliente);
		await davService.atualizar(id, {
			idcliente: idcliente || undefined,
			nomecliente:
				cliente?.razaosocial?.trim() || cliente?.nome?.trim() || undefined,
			cnpjcpfcliente: cliente?.cnpjcpf ?? undefined,
			idtipodocumentofinanceiro: idtipodocumento || undefined,
			idcondicaopagamento: idcondicaopagto || undefined,
			idlocalestoque: idlocalestoque || undefined,
			descontosubtotal: descontoNumero > 0 ? descontoNumero.toFixed(2) : "0",
			valor: totalPedido.toFixed(2),
			observacao: observacao.trim() || undefined,
		});
	}

	async function irParaEmissaoNfe() {
		if (!idcondicaopagto) {
			toast.error("Informe o meio de pagamento antes de faturar.");
			return;
		}
		if (!idtipodocumento) {
			toast.error(
				"Informe a forma de recebimento (NF-e / financeiro) antes de faturar.",
			);
			return;
		}

		setIndoParaEmissao(true);
		try {
			await salvarPedidoAsync();
			router.push(`/nota-fiscal-venda/nova?pedido=${id}`);
		} catch (erro) {
			toast.error("Erro ao preparar emissão da NF-e", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		} finally {
			setIndoParaEmissao(false);
		}
	}

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para abrir o pedido.
					</p>
				</div>
			</PageContainer>
		);
	}

	if (carregandoPedido) {
		return (
			<PageContainer>
				<div className="p-6 text-muted-foreground">Carregando pedido...</div>
			</PageContainer>
		);
	}

	if (!pedido) {
		return (
			<PageContainer>
				<div className="p-6">
					<p className="text-muted-foreground">Pedido não encontrado.</p>
					<Button variant="link" asChild className="px-0">
						<Link href="/pedidos">Voltar para pedidos</Link>
					</Button>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-6 p-4 md:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
							<Link href="/pedidos">
								<ArrowLeft className="h-4 w-4" />
								Pedidos
							</Link>
						</Button>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-tight">
								Pedido {pedido.codigo ?? pedido.id.slice(0, 8)}
							</h1>
							{pedidoFaturado ? (
								<Badge>NF-e emitida</Badge>
							) : (
								<Badge variant="secondary">Aberto</Badge>
							)}
						</div>
						{pedido.idnotafiscal && (
							<Button variant="link" asChild className="h-auto p-0">
								<Link href={`/nota-fiscal-venda/${pedido.idnotafiscal}`}>
									<ExternalLink className="h-4 w-4" />
									Ver NF-e vinculada
								</Link>
							</Button>
						)}
					</div>

					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							onClick={() => salvarPedido()}
							disabled={salvandoPedido || pedidoFaturado}
						>
							<Save className="h-4 w-4" />
							{salvandoPedido ? "Salvando..." : "Salvar"}
						</Button>
						<Button
							onClick={() => void irParaEmissaoNfe()}
							disabled={!podeFaturar || indoParaEmissao || pedidoFaturado}
						>
							<Send className="h-4 w-4" />
							{indoParaEmissao ? "Abrindo emissão..." : "Faturar NF-e"}
						</Button>
					</div>
				</div>

				<FieldGroup>
					<FieldSet>
						<FieldLegend>Dados do pedido</FieldLegend>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="cliente-pedido">Cliente</FieldLabel>
								<Combobox
									options={(entidadesLista ?? []).map((entidade) => ({
										value: entidade.id,
										label:
											entidade.razaosocial?.trim() ||
											entidade.nome ||
											entidade.cnpjcpf,
									}))}
									value={idcliente}
									onChange={setIdcliente}
									placeholder="Selecione o cliente"
									searchPlaceholder="Buscar cliente..."
									emptyMessage="Nenhum cliente encontrado."
									disabled={pedidoFaturado}
								/>
							</Field>

							<Field>
								<FieldLabel>Desconto no subtotal</FieldLabel>
								<MoneyInput
									value={desconto}
									onChange={setDesconto}
									disabled={pedidoFaturado}
								/>
							</Field>
						</div>

						<div className="mt-4">
							<CamposIntegracaoNfVenda
								variante="pedido"
								idtipodocumento={idtipodocumento}
								idcondicaopagto={idcondicaopagto}
								idplanocontas={idplanocontas}
								idlocalestoque={idlocalestoque}
								gerarFinanceiro
								gerarEstoque
								mostrarFlagsIntegracao={false}
								desabilitado={pedidoFaturado}
								onIdtipodocumentoChange={setIdtipodocumento}
								onIdcondicaopagtoChange={setIdcondicaopagto}
								onIdplanocontasChange={setIdplanocontas}
								onIdlocalestoqueChange={setIdlocalestoque}
								onGerarFinanceiroChange={() => undefined}
								onGerarEstoqueChange={() => undefined}
							/>
						</div>

						<Field className="mt-4">
							<FieldLabel htmlFor="observacao-pedido">Observação</FieldLabel>
							<Textarea
								id="observacao-pedido"
								value={observacao}
								onChange={(event) => setObservacao(event.target.value)}
								rows={2}
								disabled={pedidoFaturado}
							/>
						</Field>
					</FieldSet>
				</FieldGroup>

				<Separator />

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">Itens</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setItemEditando(null);
								setModalItemAberto(true);
							}}
							disabled={pedidoFaturado}
						>
							<Plus className="h-4 w-4" />
							Adicionar item
						</Button>
					</div>

					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Produto</TableHead>
									<TableHead className="text-right">Qtd</TableHead>
									<TableHead className="text-right">Preço</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{carregandoItens ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center text-muted-foreground">
											Carregando itens...
										</TableCell>
									</TableRow>
								) : itens.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center text-muted-foreground">
											Nenhum item no pedido.
										</TableCell>
									</TableRow>
								) : (
									itens.map((item) => {
										const qtd = parseFloat(item.quantidade ?? "0");
										const preco = parseFloat(item.preco ?? "0");
										const total =
											parseFloat(item.total ?? "0") || qtd * preco;

										return (
											<TableRow key={item.id}>
												<TableCell>
													{item.nomeproduto ??
														(item.idproduto
															? mapaProdutos.get(item.idproduto)
															: undefined) ??
														item.codigoproduto ??
														"—"}
												</TableCell>
												<TableCell className="text-right">{qtd}</TableCell>
												<TableCell className="text-right">
													{formatarMoeda(preco)}
												</TableCell>
												<TableCell className="text-right">
													{formatarMoeda(total)}
												</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-1">
														<Button
															variant="ghost"
															size="icon"
															onClick={() => {
																setItemEditando(item);
																setModalItemAberto(true);
															}}
															disabled={pedidoFaturado}
															aria-label="Editar item"
														>
															<Pencil className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => excluirItem(item.id)}
															disabled={pedidoFaturado || excluindoItem}
															aria-label="Excluir item"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex flex-col items-end gap-1 text-sm">
						<div className="flex gap-8">
							<span className="text-muted-foreground">Subtotal</span>
							<span>{formatarMoeda(totalItens)}</span>
						</div>
						{descontoNumero > 0 && (
							<div className="flex gap-8">
								<span className="text-muted-foreground">Desconto</span>
								<span>- {formatarMoeda(descontoNumero)}</span>
							</div>
						)}
						<div className="flex gap-8 text-base font-semibold">
							<span>Total</span>
							<span>{formatarMoeda(totalPedido)}</span>
						</div>
					</div>
				</div>
			</div>

			<ModalItemPedido
				open={modalItemAberto}
				onClose={() => {
					setModalItemAberto(false);
					setItemEditando(null);
				}}
				onConfirmar={(dados) => salvarItem(dados)}
				idempresa={empresa.id}
				itemParaEditar={itemEditando}
				carregando={salvandoItem}
			/>
		</PageContainer>
	);
}
