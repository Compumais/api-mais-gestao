"use client";

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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CampoDescontoTotalNfe } from "@/app/(auth)/nota-fiscal-venda/components/campo-desconto-total-nfe";
import { CamposIntegracaoNfVenda } from "@/app/(auth)/nota-fiscal-venda/components/campos-integracao-nf-venda";
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
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	DAV_STATUS,
	pedidoEhOrigemPos,
	pedidoJaFaturado,
	pedidoPodeEmitirNfce,
	pedidoPodeFaturarNfe,
} from "@/constants/dav-status";
import { useEmpresa } from "@/hooks/use-empresa";
import { useTituloAba } from "@/hooks/use-titulo-aba";
import { salvarNovoPedidoDavSchema } from "@/schemas/dav.schema";
import {
	type AtualizarPedidoData,
	davService,
	type PedidoDav,
	type PedidoDavItem,
} from "@/services/dav.service";
import { entidadesService } from "@/services/entidades.service";
import { produtosService } from "@/services/produtos.service";
import { distribuirDescontosEmissaoNfe } from "@/util/distribuir-descontos-emissao-nfe";
import { PageContainer } from "../../components/page-container";
import { ModalImprimirPedido } from "./modal-imprimir-pedido";
import { ModalItemPedido } from "./modal-item-pedido";

const formatarMoeda = (valor: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);

const formatarQuantidade = (valor: number) =>
	new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 4,
	}).format(Number.isFinite(valor) ? valor : 0);

function totalLinha(quantidade: string, preco: string, desconto?: string) {
	const qtd = parseFloat(quantidade);
	const valor = parseFloat(preco);
	const desc = Math.max(0, parseFloat(desconto ?? "0") || 0);
	if (!Number.isFinite(qtd) || !Number.isFinite(valor)) return "0.00";
	const bruto = Math.round(qtd * valor * 100) / 100;
	return Math.max(0, bruto - desc).toFixed(2);
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
	const [descontoGlobal, setDescontoGlobal] = useState(0);
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

	useTituloAba(
		pedidoId && pedido
			? `Pedido ${pedido.codigo ?? pedidoId.slice(0, 8)}`
			: undefined,
	);

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
		const descBruto =
			parseFloat(
				String(pedido.descontosubtotal ?? pedido.desconto ?? "0").replace(
					",",
					".",
				),
			) || 0;
		setDescontoGlobal(Math.max(0, Math.round(descBruto * 100) / 100));
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

	const mapaProdutos = useMemo(() => {
		const mapa = new Map<string, string>();
		for (const produto of produtosLista ?? []) {
			mapa.set(
				produto.id,
				produto.descricao?.trim() ||
					produto.nome ||
					String(produto.codigo ?? ""),
			);
		}
		return mapa;
	}, [produtosLista]);

	const mapaSaldosProdutos = useMemo(() => {
		const mapa = new Map<
			string,
			{
				estoque: number;
				provisionadoBanco: number;
				unidademedida: string | null;
			}
		>();
		for (const produto of produtosLista ?? []) {
			const estoque = Number(produto.quantidade ?? 0);
			const provisionadoBanco = Number(produto.quantidadeprovisionada ?? 0);
			mapa.set(produto.id, {
				estoque: Number.isFinite(estoque) ? estoque : 0,
				provisionadoBanco: Number.isFinite(provisionadoBanco)
					? provisionadoBanco
					: 0,
				unidademedida: produto.unidademedida ?? null,
			});
		}
		return mapa;
	}, [produtosLista]);

	const quantidadesLocaisPorProduto = useMemo(() => {
		if (!modoCriacao) return {};
		const acumulado: Record<string, number> = {};
		for (const item of itensLocais) {
			if (!item.idproduto) continue;
			const qtd = parseFloat(item.quantidade ?? "0") || 0;
			acumulado[item.idproduto] = (acumulado[item.idproduto] ?? 0) + qtd;
		}
		return acumulado;
	}, [modoCriacao, itensLocais]);

	const quantidadesLocaisParaModal = useMemo(() => {
		if (!modoCriacao) return {};
		const acumulado: Record<string, number> = {};
		for (const item of itensLocais) {
			if (!item.idproduto) continue;
			if (itemEditando && item.id === itemEditando.id) continue;
			const qtd = parseFloat(item.quantidade ?? "0") || 0;
			acumulado[item.idproduto] = (acumulado[item.idproduto] ?? 0) + qtd;
		}
		return acumulado;
	}, [modoCriacao, itensLocais, itemEditando]);

	const totalBrutoItens = useMemo(
		() =>
			Math.round(
				itens.reduce((acc, item) => {
					const qtd = parseFloat(item.quantidade ?? "0") || 0;
					const preco = parseFloat(item.preco ?? "0") || 0;
					return acc + Math.round(qtd * preco * 100) / 100;
				}, 0) * 100,
			) / 100,
		[itens],
	);

	const distribuicaoDesconto = useMemo(
		() =>
			distribuirDescontosEmissaoNfe(
				itens.map((item) => ({
					quantidade: parseFloat(item.quantidade ?? "0") || 0,
					valorUnitario: parseFloat(item.preco ?? "0") || 0,
					desconto: parseFloat(item.desconto ?? "0") || 0,
				})),
				descontoGlobal,
			),
		[itens, descontoGlobal],
	);

	const subtotalAposDescontoItens = useMemo(
		() =>
			Math.max(
				0,
				Math.round(
					(totalBrutoItens - distribuicaoDesconto.descontoItens) * 100,
				) / 100,
			),
		[totalBrutoItens, distribuicaoDesconto.descontoItens],
	);

	useEffect(() => {
		setDescontoGlobal((anterior) => {
			if (subtotalAposDescontoItens <= 0) return anterior === 0 ? anterior : 0;
			if (anterior > subtotalAposDescontoItens + 0.0001) {
				return subtotalAposDescontoItens;
			}
			return anterior;
		});
	}, [subtotalAposDescontoItens]);

	const descontoNumero = distribuicaoDesconto.descontoGlobal;
	const totalPedido = Math.max(
		Math.round((totalBrutoItens - distribuicaoDesconto.descontoTotal) * 100) /
			100,
		0,
	);

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
				descontoNumero > 0
					? descontoNumero.toFixed(2)
					: pedido.descontosubtotal,
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
		mutationFn: async (opcoes: { concluir?: boolean }) => {
			if (distribuicaoDesconto.erros.length > 0) {
				throw new Error(
					distribuicaoDesconto.erros[0]?.mensagem ?? "Desconto inválido",
				);
			}
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
										desconto: item.desconto ?? "0",
										total:
											item.total ??
											totalLinha(
												item.quantidade ?? "1",
												item.preco ?? "0",
												item.desconto ?? "0",
											),
										unidademedida: item.unidademedida ?? undefined,
										rastros: item.rastros,
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
					await davService.criarItem(criado.id, {
						idproduto: item.idproduto,
						quantidade: item.quantidade,
						preco: item.preco,
						desconto: item.desconto,
						total: item.total,
						unidademedida: item.unidademedida,
						rastros: item.rastros,
					});
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
			void queryClient.invalidateQueries({
				queryKey: ["produtos-pedido-detalhe", empresa?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: ["produtos-pedido-busca", empresa?.id],
			});
			if (resultado.pedido) {
				toast.success(opcoes?.concluir ? "Pedido concluído" : "Pedido salvo");
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
			desconto?: string;
			total?: string;
			unidademedida?: string;
			rastros?: PedidoDavItem["rastros"];
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
			void queryClient.invalidateQueries({
				queryKey: ["produtos-pedido-detalhe", empresa?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: ["produtos-pedido-busca", empresa?.id],
			});
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
			void queryClient.invalidateQueries({
				queryKey: ["produtos-pedido-detalhe", empresa?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: ["produtos-pedido-busca", empresa?.id],
			});
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
			void queryClient.invalidateQueries({
				queryKey: ["produtos-pedido-detalhe", empresa?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: ["produtos-pedido-busca", empresa?.id],
			});
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
		desconto?: string;
		total?: string;
		unidademedida?: string;
		rastros?: PedidoDavItem["rastros"];
	}) {
		const nomeproduto = mapaProdutos.get(dados.idproduto) ?? null;
		const total =
			dados.total ?? totalLinha(dados.quantidade, dados.preco, dados.desconto);

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
								desconto: dados.desconto ?? "0.00",
								total,
								unidademedida: dados.unidademedida ?? item.unidademedida,
								rastros: dados.rastros,
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
					desconto: dados.desconto ?? "0.00",
					total,
					unidademedida: dados.unidademedida ?? null,
					idcfop: null,
					rastros: dados.rastros,
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
		desconto?: string;
		total?: string;
		unidademedida?: string;
		rastros?: PedidoDavItem["rastros"];
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
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1.5">
						<Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
							<Link href={hrefListaPedidos}>
								<ArrowLeft className="h-4 w-4" aria-hidden="true" />
								{origemPos ? "Pedidos da maquininha" : "Pedidos"}
							</Link>
						</Button>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-tight">
								{modoCriacao
									? "Novo pedido de faturamento"
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
						<p className="text-xs text-muted-foreground">
							Preencha o cliente, adicione os produtos conferindo o saldo
							previsto, aplique descontos e conclua ou fature o pedido.
						</p>
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
							onClick={() => salvarPedido({})}
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

				{/* 1. Dados do pedido */}
				<FieldGroup>
					<FieldSet>
						<FieldLegend>1. Dados do pedido</FieldLegend>
						<div className="grid grid-cols-1 gap-4">
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
									searchPlaceholder="Buscar cliente por nome, razão social ou CPF/CNPJ..."
									emptyMessage="Nenhum cliente encontrado."
									disabled={pedidoFaturado || pedidoCancelado}
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
								desabilitado={pedidoFaturado || pedidoCancelado}
								onIdtipodocumentoChange={setIdtipodocumento}
								onIdcondicaopagtoChange={setIdcondicaopagto}
								onIdplanocontasChange={setIdplanocontas}
								onIdlocalestoqueChange={setIdlocalestoque}
								onGerarFinanceiroChange={() => undefined}
								onGerarEstoqueChange={() => undefined}
							/>
						</div>
					</FieldSet>
				</FieldGroup>

				<Separator />

				{/* 2. Itens do pedido */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-base font-medium">2. Itens do pedido</h2>
							<p className="text-xs text-muted-foreground">
								O saldo previsto considera a quantidade do produto em estoque
								menos a quantidade provisionada nos pedidos de faturamento.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setItemEditando(null);
								setModalItemAberto(true);
							}}
							disabled={pedidoFaturado || pedidoCancelado}
						>
							<Plus className="h-4 w-4" aria-hidden="true" />
							Adicionar item
						</Button>
					</div>

					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10">#</TableHead>
									<TableHead>Produto</TableHead>
									<TableHead className="w-16 text-center">UN</TableHead>
									<TableHead className="text-right">Qtd</TableHead>
									<TableHead className="text-right">Saldo previsto</TableHead>
									<TableHead className="text-right">Preço unit.</TableHead>
									<TableHead className="text-right">Desconto</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead className="w-24" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{!modoCriacao && carregandoItens ? (
									<TableRow>
										<TableCell
											colSpan={9}
											className="py-8 text-center text-muted-foreground"
										>
											Carregando itens...
										</TableCell>
									</TableRow>
								) : itens.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={9}
											className="py-8 text-center text-muted-foreground"
										>
											Nenhum item adicionado ao pedido.
										</TableCell>
									</TableRow>
								) : (
									itens.map((item, idx) => {
										const qtd = parseFloat(item.quantidade ?? "0") || 0;
										const preco = parseFloat(item.preco ?? "0") || 0;
										const linhaRateio = distribuicaoDesconto.linhas[idx];
										const descontoExplicito =
											linhaRateio?.descontoExplicito ??
											(parseFloat(item.desconto ?? "0") || 0);
										const descontoGlobalRateado =
											linhaRateio?.descontoGlobalRateado ?? 0;
										const descontoEfetivo =
											linhaRateio?.descontoEfetivo ?? descontoExplicito;
										const liquido =
											linhaRateio?.liquido ??
											Math.max(0, qtd * preco - descontoEfetivo);

										const infoSaldo = item.idproduto
											? mapaSaldosProdutos.get(item.idproduto)
											: undefined;
										const estoqueProduto = infoSaldo?.estoque ?? null;
										const provisionadoTotal =
											infoSaldo != null
												? infoSaldo.provisionadoBanco +
													(item.idproduto
														? (quantidadesLocaisPorProduto[item.idproduto] ?? 0)
														: 0)
												: null;
										const saldoPrevisto =
											estoqueProduto != null && provisionadoTotal != null
												? estoqueProduto - provisionadoTotal
												: null;
										const unidade =
											item.unidademedida ?? infoSaldo?.unidademedida ?? "—";

										return (
											<TableRow key={item.id}>
												<TableCell className="text-muted-foreground">
													{idx + 1}
												</TableCell>
												<TableCell className="font-medium">
													{item.nomeproduto ??
														(item.idproduto
															? mapaProdutos.get(item.idproduto)
															: undefined) ??
														item.codigoproduto ??
														"—"}
												</TableCell>
												<TableCell className="text-center text-xs text-muted-foreground">
													{unidade}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{formatarQuantidade(qtd)}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{saldoPrevisto !== null ? (
														<div>
															<span
																className={
																	saldoPrevisto < 0
																		? "font-semibold text-destructive"
																		: "font-medium"
																}
															>
																{formatarQuantidade(saldoPrevisto)}
															</span>
															<span className="block text-[11px] text-muted-foreground">
																Est.: {formatarQuantidade(estoqueProduto ?? 0)}{" "}
																· Prov.:{" "}
																{formatarQuantidade(provisionadoTotal ?? 0)}
															</span>
														</div>
													) : (
														<span className="text-muted-foreground">—</span>
													)}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{formatarMoeda(preco)}
												</TableCell>
												<TableCell className="text-right tabular-nums text-muted-foreground">
													{descontoEfetivo > 0 ? (
														<div>
															<span>{formatarMoeda(descontoEfetivo)}</span>
															{descontoGlobalRateado > 0 && (
																<span className="block text-[11px] text-muted-foreground">
																	{descontoExplicito > 0
																		? `item ${formatarMoeda(descontoExplicito)} + rateio ${formatarMoeda(descontoGlobalRateado)}`
																		: `rateio ${formatarMoeda(descontoGlobalRateado)}`}
																</span>
															)}
														</div>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell className="text-right font-medium tabular-nums">
													{formatarMoeda(liquido)}
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
															disabled={pedidoFaturado || pedidoCancelado}
															aria-label="Editar item"
														>
															<Pencil className="h-4 w-4" aria-hidden="true" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleExcluirItem(item.id)}
															disabled={
																pedidoFaturado ||
																pedidoCancelado ||
																excluindoItem
															}
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

					{/* 3. Desconto e Totais (mesma metodologia da emissão de NF-e de venda) */}
					<div className="space-y-3 rounded-md border bg-muted/20 px-4 py-3 text-sm">
						<CampoDescontoTotalNfe
							rotuloDocumento="pedido"
							desconto={descontoGlobal}
							onDescontoChange={setDescontoGlobal}
							itens={itens.map((item) => ({
								quantidade: parseFloat(item.quantidade ?? "0") || 0,
								valorUnitario: parseFloat(item.preco ?? "0") || 0,
								desconto: parseFloat(item.desconto ?? "0") || 0,
							}))}
							descontoItens={distribuicaoDesconto.descontoItens}
							descontoTotal={distribuicaoDesconto.descontoTotal}
							disabled={pedidoFaturado || pedidoCancelado}
						/>

						{distribuicaoDesconto.erros.length > 0 && (
							<div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
								{distribuicaoDesconto.erros.map((erro) => (
									<p key={`${erro.caminho.join(".")}:${erro.mensagem}`}>
										{erro.mensagem}
									</p>
								))}
							</div>
						)}

						<div className="flex flex-wrap items-center justify-end gap-6 border-t pt-3">
							<div>
								<span className="text-muted-foreground">Produtos: </span>
								<span className="font-medium tabular-nums">
									{formatarMoeda(totalBrutoItens)}
								</span>
							</div>
							<div>
								<span className="text-muted-foreground">
									Desconto nos itens:{" "}
								</span>
								<span className="font-medium tabular-nums">
									{formatarMoeda(distribuicaoDesconto.descontoItens)}
								</span>
							</div>
							<div>
								<span className="text-muted-foreground">
									Desconto no total:{" "}
								</span>
								<span className="font-medium tabular-nums">
									{formatarMoeda(distribuicaoDesconto.descontoGlobal)}
								</span>
							</div>
							<div className="text-base">
								<span className="text-muted-foreground">Total do pedido: </span>
								<span className="font-semibold tabular-nums">
									{formatarMoeda(totalPedido)}
								</span>
							</div>
						</div>
					</div>
				</div>

				<Separator />

				{/* 4. Observação (no fim da página) */}
				<FieldGroup>
					<FieldSet>
						<FieldLegend>3. Observação</FieldLegend>
						<Field>
							<FieldLabel htmlFor="observacao-pedido">
								Observações do pedido
							</FieldLabel>
							<Textarea
								id="observacao-pedido"
								placeholder="Informações complementares ou observações para entrega / faturamento..."
								value={observacao}
								onChange={(event) => setObservacao(event.target.value)}
								rows={3}
								disabled={pedidoFaturado || pedidoCancelado}
							/>
						</Field>
					</FieldSet>
				</FieldGroup>

				<div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-sm">
						<span className="text-muted-foreground">Total líquido: </span>
						<span className="text-lg font-semibold tabular-nums">
							{formatarMoeda(totalPedido)}
						</span>
						<span className="ml-3 text-xs text-muted-foreground">
							({itens.length} {itens.length === 1 ? "item" : "itens"})
						</span>
					</div>
					<div className="flex flex-wrap gap-2">
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
							variant={podeConcluir ? "outline" : "default"}
							onClick={() => salvarPedido({})}
							disabled={salvandoPedido || pedidoFaturado || pedidoCancelado}
						>
							<Save className="h-4 w-4" aria-hidden="true" />
							{salvandoPedido
								? "Salvando..."
								: modoCriacao
									? "Salvar pedido"
									: "Salvar"}
						</Button>
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
				quantidadesLocaisPorProduto={quantidadesLocaisParaModal}
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
