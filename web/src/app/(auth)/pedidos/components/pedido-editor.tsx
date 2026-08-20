"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	ArrowLeft,
	CheckCircle2,
	ExternalLink,
	Pencil,
	Plus,
	Printer,
	Save,
	Send,
	Trash2,
	XCircle,
} from "lucide-react";
import { toast } from "sonner";
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
import {
	DAV_STATUS,
	pedidoEhOrigemPos,
	pedidoJaFaturado,
	pedidoPodeEmitirNfce,
	pedidoPodeFaturarNfe,
} from "@/constants/dav-status";
import { salvarNovoPedidoDavSchema } from "@/schemas/dav.schema";
import { entidadesService } from "@/services/entidades.service";
import {
	davService,
	type AtualizarPedidoData,
	type PedidoDav,
	type PedidoDavItem,
} from "@/services/dav.service";
import { produtosService } from "@/services/produtos.service";
import { CamposIntegracaoNfVenda } from "@/app/(auth)/nota-fiscal-venda/components/campos-integracao-nf-venda";
import { PageContainer } from "../../components/page-container";
import { ModalImprimirPedido } from "./modal-imprimir-pedido";
import { ModalItemPedido } from "./modal-item-pedido";

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

function totalLinha(quantidade: string, preco: string) {
	const qtd = parseFloat(quantidade);
	const valor = parseFloat(preco);
	if (!Number.isFinite(qtd) || !Number.isFinite(valor)) return "0.00";
	return (qtd * valor).toFixed(2);
}

type PedidoEditorProps = {
	pedidoId?: string;
};

export function PedidoEditor({ pedidoId }: PedidoEditorProps) {
	const modoCriacao = !pedidoId;
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const [idcliente, setIdcliente] = useState("");
	const [idtipodocumento, setIdtipodocumento] = useState("");
	const [idcondicaopagto, setIdcondicaopagto] = useState("");
	const [idplanocontas, setIdplanocontas] = useState("");
	const [idlocalestoque, setIdlocalestoque] = useState("");
	const [desconto, setDesconto] = useState("0");
	const [observacao, setObservacao] = useState("");
	const [itensLocais, setItensLocais] = useState<PedidoDavItem[]>([]);

	const [modalItemAberto, setModalItemAberto] = useState(false);
	const [itemEditando, setItemEditando] = useState<PedidoDavItem | null>(null);
	const [indoParaEmissao, setIndoParaEmissao] = useState(false);
	const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
	const [modalImpressaoAberto, setModalImpressaoAberto] = useState(false);

	const { data: pedido, isLoading: carregandoPedido } = useQuery({
		queryKey: ["pedido", pedidoId],
		queryFn: () => davService.buscar(pedidoId ?? ""),
		enabled: !!pedidoId,
	});

	const { data: itensServidor = [], isLoading: carregandoItens } = useQuery({
		queryKey: ["pedido-itens", pedidoId],
		queryFn: () => davService.listarItens(pedidoId ?? ""),
		enabled: !!pedidoId,
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

	useEffect(() => {
		if (modoCriacao || !pedido || !pedidoId) return;
		if (searchParams.get("imprimir") !== "1") return;
		setModalImpressaoAberto(true);
		router.replace(
			searchParams.get("origem")
				? `/pedidos/${pedidoId}?origem=${searchParams.get("origem")}`
				: `/pedidos/${pedidoId}`,
			{ scroll: false },
		);
	}, [modoCriacao, pedido, pedidoId, router, searchParams]);

	const itens = modoCriacao ? itensLocais : itensServidor;
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
	const origemPos =
		pedidoEhOrigemPos(pedido ?? {}) ||
		searchParams.get("origem")?.toUpperCase() === "POS";
	const hrefListaPedidos = origemPos ? "/pedidos?origem=POS" : "/pedidos";
	const pedidoFaturado = !modoCriacao && pedidoJaFaturado(pedido ?? {});
	const pedidoCancelado = pedido?.status === DAV_STATUS.CANCELADO;
	const podeCancelar = !!pedido && !pedidoFaturado && !pedidoCancelado;
	const podeEmitirNfce =
		!modoCriacao &&
		origemPos &&
		!!pedido &&
		pedidoPodeEmitirNfce(pedido) &&
		itens.length > 0;
	const podeFaturarNfe =
		!modoCriacao &&
		!origemPos &&
		!!pedido &&
		pedidoPodeFaturarNfe(pedido) &&
		itens.length > 0 &&
		!!idcliente &&
		!!idcondicaopagto &&
		!!idtipodocumento;
	const pedidoFechado = pedido?.status === DAV_STATUS.FECHADO;
	const podeConcluir = !pedidoFaturado && !pedidoCancelado && !pedidoFechado;

	const pedidoParaImpressao = useMemo((): PedidoDav | null => {
		if (!pedido) return null;
		const cliente = entidadesLista?.find((item) => item.id === idcliente);
		return {
			...pedido,
			idcliente: idcliente || pedido.idcliente,
			nomecliente:
				cliente?.razaosocial?.trim() ||
				cliente?.nome?.trim() ||
				pedido.nomecliente,
			cnpjcpfcliente: cliente?.cnpjcpf ?? pedido.cnpjcpfcliente,
			observacao: observacao.trim() || pedido.observacao,
			descontosubtotal:
				descontoNumero > 0 ? descontoNumero.toFixed(2) : pedido.descontosubtotal,
			valor: totalPedido.toFixed(2),
		};
	}, [
		pedido,
		entidadesLista,
		idcliente,
		observacao,
		descontoNumero,
		totalPedido,
	]);

	const itensParaImpressao = useMemo(
		() =>
			itens.map((item) => ({
				...item,
				nomeproduto:
					item.nomeproduto ??
					(item.idproduto ? mapaProdutos.get(item.idproduto) : undefined) ??
					item.codigoproduto,
			})),
		[itens, mapaProdutos],
	);

	function montarPayloadCabecalho(): AtualizarPedidoData {
		const cliente = entidadesLista?.find((item) => item.id === idcliente);
		return {
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
		};
	}

	const { mutate: salvarPedido, isPending: salvandoPedido } = useMutation({
		mutationFn: async (opcoes?: { concluir?: boolean }) => {
			if (modoCriacao) {
				const validacao = salvarNovoPedidoDavSchema.safeParse({
					idcliente,
					itens: itensLocais.flatMap((item) =>
						item.idproduto
							? [
									{
										idproduto: item.idproduto,
										quantidade: item.quantidade ?? "1",
										preco: item.preco ?? "0",
									},
								]
							: [],
					),
				});

				if (!validacao.success) {
					return {
						vazio: true as const,
						mensagem: validacao.error.issues[0]?.message,
					};
				}

				if (!empresa) throw new Error("Empresa não selecionada");
				const agora = dayjs();
				const criado = await davService.criar({
					idempresa: empresa.id,
					status: opcoes?.concluir ? DAV_STATUS.FECHADO : 0,
					tipodocumento: 4,
					data: agora.format("YYYY-MM-DD"),
					datainclusao: agora.toISOString(),
					currenttimemillis: agora.valueOf(),
					...montarPayloadCabecalho(),
				});

				for (const item of validacao.data.itens) {
					await davService.criarItem(criado.id, item);
				}

				return { vazio: false as const, pedido: criado };
			}

			if (!pedidoId) throw new Error("Pedido não informado");
			await davService.atualizar(pedidoId, {
				...montarPayloadCabecalho(),
				...(opcoes?.concluir ? { status: DAV_STATUS.FECHADO } : {}),
			});
			return { vazio: false as const };
		},
		onSuccess: (resultado, opcoes) => {
			if (resultado.vazio) {
				toast.error(
					resultado.mensagem ??
						"Informe o cliente ou adicione ao menos um item para salvar o pedido.",
				);
				return;
			}

			void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
			if (resultado.pedido) {
				toast.success(
					opcoes?.concluir ? "Pedido concluído" : "Pedido salvo",
				);
				router.push(
					opcoes?.concluir
						? `/pedidos/${resultado.pedido.id}?imprimir=1`
						: `/pedidos/${resultado.pedido.id}`,
				);
				return;
			}
			if (pedidoId) {
				void queryClient.invalidateQueries({ queryKey: ["pedido", pedidoId] });
			}
			toast.success(opcoes?.concluir ? "Pedido concluído" : "Pedido salvo");
			if (opcoes?.concluir) {
				setModalImpressaoAberto(true);
			}
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
			if (!pedidoId) throw new Error("Pedido não informado");
			if (itemEditando) {
				return davService.atualizarItem(pedidoId, itemEditando.id, dados);
			}
			return davService.criarItem(pedidoId, dados);
		},
		onSuccess: () => {
			if (pedidoId) {
				void queryClient.invalidateQueries({
					queryKey: ["pedido-itens", pedidoId],
				});
				void queryClient.invalidateQueries({ queryKey: ["pedido", pedidoId] });
			}
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
		mutationFn: (iditem: string) => {
			if (!pedidoId) throw new Error("Pedido não informado");
			return davService.excluirItem(pedidoId, iditem);
		},
		onSuccess: () => {
			if (pedidoId) {
				void queryClient.invalidateQueries({
					queryKey: ["pedido-itens", pedidoId],
				});
			}
			toast.success("Item removido");
		},
		onError: (erro) => {
			toast.error("Erro ao remover item", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: cancelarPedido, isPending: cancelando } = useMutation({
		mutationFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			if (!pedidoId) throw new Error("Pedido não informado");
			return davService.cancelar(pedidoId, empresa.id);
		},
		onSuccess: () => {
			if (pedidoId) {
				void queryClient.invalidateQueries({ queryKey: ["pedido", pedidoId] });
			}
			void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
			setConfirmandoCancelamento(false);
			toast.success("Pedido cancelado");
		},
		onError: (erro) => {
			toast.error("Erro ao cancelar pedido", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	function confirmarItemLocal(dados: {
		idproduto: string;
		quantidade: string;
		preco: string;
	}) {
		const nomeproduto = mapaProdutos.get(dados.idproduto) ?? null;
		const total = totalLinha(dados.quantidade, dados.preco);

		if (itemEditando) {
			setItensLocais((atuais) =>
				atuais.map((item) =>
					item.id === itemEditando.id
						? {
								...item,
								idproduto: dados.idproduto,
								nomeproduto,
								quantidade: dados.quantidade,
								preco: dados.preco,
								total,
							}
						: item,
				),
			);
			toast.success("Item atualizado");
		} else {
			setItensLocais((atuais) => [
				...atuais,
				{
					id: crypto.randomUUID(),
					iddav: "",
					idproduto: dados.idproduto,
					nomeproduto,
					codigoproduto: null,
					quantidade: dados.quantidade,
					preco: dados.preco,
					total,
					unidademedida: null,
					idcfop: null,
				},
			]);
			toast.success("Item adicionado");
		}

		setModalItemAberto(false);
		setItemEditando(null);
	}

	function handleConfirmarItem(dados: {
		idproduto: string;
		quantidade: string;
		preco: string;
	}) {
		if (modoCriacao) {
			confirmarItemLocal(dados);
			return;
		}
		salvarItem(dados);
	}

	function handleExcluirItem(iditem: string) {
		if (modoCriacao) {
			setItensLocais((atuais) => atuais.filter((item) => item.id !== iditem));
			toast.success("Item removido");
			return;
		}
		excluirItem(iditem);
	}

	async function salvarPedidoAsync() {
		if (!pedidoId) return;
		await davService.atualizar(pedidoId, montarPayloadCabecalho());
	}

	async function irParaEmissaoNfe() {
		if (!pedidoId) return;
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
			router.push(`/nota-fiscal-venda/nova?pedido=${pedidoId}`);
		} catch (erro) {
			toast.error("Erro ao preparar emissão da NF-e", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		} finally {
			setIndoParaEmissao(false);
		}
	}

	async function emitirNfce() {
		if (!empresa || !pedidoId) return;
		setIndoParaEmissao(true);
		try {
			await salvarPedidoAsync();
			const resultado = await davService.faturarNfce(pedidoId, {
				idempresa: empresa.id,
				gerarFinanceiro: true,
				gerarEstoque: true,
			});
			void queryClient.invalidateQueries({ queryKey: ["pedido", pedidoId] });
			void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
			if (resultado.emitida) {
				toast.success("NFC-e autorizada");
				router.push("/nfce");
				return;
			}
			const motivo =
				resultado.erro ||
				resultado.xMotivo ||
				resultado.pendencias?.map((p) => p.mensagem).join("; ") ||
				"NFC-e não autorizada";
			toast.error("NFC-e não autorizada", { description: motivo });
			if (resultado.idnotafiscal) {
				router.push("/nfce");
			}
		} catch (erro) {
			toast.error("Erro ao emitir NFC-e", {
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
						Selecione uma empresa para {modoCriacao ? "criar" : "abrir"} o
						pedido.
					</p>
				</div>
			</PageContainer>
		);
	}

	if (!modoCriacao && carregandoPedido) {
		return (
			<PageContainer>
				<div className="p-6 text-muted-foreground">Carregando pedido...</div>
			</PageContainer>
		);
	}

	if (!modoCriacao && !pedido) {
		return (
			<PageContainer>
				<div className="p-6">
					<p className="text-muted-foreground">Pedido não encontrado.</p>
					<Button variant="link" asChild className="px-0">
						<Link href={hrefListaPedidos}>Voltar para pedidos</Link>
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
							<Link href={hrefListaPedidos}>
								<ArrowLeft className="h-4 w-4" aria-hidden="true" />
								{origemPos ? "Pedidos da maquininha" : "Pedidos"}
							</Link>
						</Button>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-tight">
								{modoCriacao
									? "Novo pedido"
									: `Pedido ${pedido?.codigo ?? pedidoId?.slice(0, 8)}`}
							</h1>
							{origemPos && <Badge variant="secondary">POS</Badge>}
							{modoCriacao ? (
								<Badge variant="secondary">Não salvo</Badge>
							) : pedido?.idnfce ? (
								<Badge>NFC-e emitida</Badge>
							) : pedido?.idnotafiscal ? (
								<Badge>NF-e emitida</Badge>
							) : pedidoCancelado ? (
								<Badge variant="destructive">Cancelado</Badge>
							) : pedidoFechado ? (
								<Badge variant="secondary">Fechado</Badge>
							) : (
								<Badge variant="secondary">Aberto</Badge>
							)}
						</div>
						{pedido?.idnfce && (
							<Button variant="link" asChild className="h-auto p-0">
								<Link href="/nfce">
									<ExternalLink className="h-4 w-4" aria-hidden="true" />
									Ver NFC-e
								</Link>
							</Button>
						)}
						{pedido?.idnotafiscal && (
							<Button variant="link" asChild className="h-auto p-0">
								<Link href={`/nota-fiscal-venda/${pedido.idnotafiscal}`}>
									<ExternalLink className="h-4 w-4" aria-hidden="true" />
									Ver NF-e vinculada
								</Link>
							</Button>
						)}
					</div>

					<div className="flex flex-wrap gap-2">
						{podeCancelar && (
							<Button
								variant="outline"
								onClick={() => setConfirmandoCancelamento(true)}
								disabled={cancelando}
							>
								<XCircle className="h-4 w-4" aria-hidden="true" />
								Cancelar pedido
							</Button>
						)}
						{!modoCriacao && (
							<Button
								variant="outline"
								onClick={() => setModalImpressaoAberto(true)}
								disabled={!pedido}
							>
								<Printer className="h-4 w-4" aria-hidden="true" />
								Imprimir
							</Button>
						)}
						{podeConcluir && (
							<Button
								onClick={() => salvarPedido({ concluir: true })}
								disabled={salvandoPedido}
							>
								<CheckCircle2 className="h-4 w-4" aria-hidden="true" />
								{salvandoPedido ? "Concluindo..." : "Concluir"}
							</Button>
						)}
						<Button
							variant="outline"
							onClick={() => salvarPedido()}
							disabled={salvandoPedido || pedidoFaturado || pedidoCancelado}
						>
							<Save className="h-4 w-4" aria-hidden="true" />
							{salvandoPedido
								? "Salvando..."
								: modoCriacao
									? "Salvar pedido"
									: "Salvar"}
						</Button>
						{!modoCriacao &&
							(origemPos ? (
								<Button
									onClick={() => void emitirNfce()}
									disabled={
										!podeEmitirNfce ||
										indoParaEmissao ||
										pedidoFaturado ||
										pedidoCancelado
									}
								>
									<Send className="h-4 w-4" aria-hidden="true" />
									{indoParaEmissao ? "Emitindo NFC-e..." : "Emitir NFC-e"}
								</Button>
							) : (
								<Button
									onClick={() => void irParaEmissaoNfe()}
									disabled={
										!podeFaturarNfe ||
										indoParaEmissao ||
										pedidoFaturado ||
										pedidoCancelado
									}
								>
									<Send className="h-4 w-4" aria-hidden="true" />
									{indoParaEmissao ? "Abrindo emissão..." : "Faturar NF-e"}
								</Button>
							))}
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
							<Plus className="h-4 w-4" aria-hidden="true" />
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
								{!modoCriacao && carregandoItens ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="text-center text-muted-foreground"
										>
											Carregando itens...
										</TableCell>
									</TableRow>
								) : itens.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="text-center text-muted-foreground"
										>
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
															<Pencil className="h-4 w-4" aria-hidden="true" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleExcluirItem(item.id)}
															disabled={pedidoFaturado || excluindoItem}
															aria-label="Excluir item"
														>
															<Trash2 className="h-4 w-4" aria-hidden="true" />
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
				onConfirmar={handleConfirmarItem}
				idempresa={empresa.id}
				itemParaEditar={itemEditando}
				carregando={salvandoItem}
			/>

			<AlertDialog
				open={confirmandoCancelamento}
				onOpenChange={setConfirmandoCancelamento}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
						<AlertDialogDescription>
							O pedido {pedido?.codigo ?? ""} será marcado como cancelado e não
							poderá ser faturado. Esta ação não remove o registro.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelando}>Voltar</AlertDialogCancel>
						<AlertDialogAction
							disabled={cancelando}
							onClick={() => cancelarPedido()}
						>
							{cancelando ? "Cancelando..." : "Confirmar cancelamento"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{pedidoParaImpressao && (
				<ModalImprimirPedido
					open={modalImpressaoAberto}
					onClose={() => setModalImpressaoAberto(false)}
					idempresa={empresa.id}
					empresa={empresa}
					pedido={pedidoParaImpressao}
					itens={itensParaImpressao}
				/>
			)}
		</PageContainer>
	);
}
