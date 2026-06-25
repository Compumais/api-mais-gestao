"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { useEmpresa } from "@/hooks/use-empresa";
import { useNfeConfiguracao } from "@/hooks/use-nfe-configuracao";
import {
	emissaoNfeFormSchema,
	type EmissaoNfeFormData,
} from "@/schemas/nfe-emissao.schema";
import {
	detectarTipoDevolucaoPorCfop,
	LABEL_TIPO_DEVOLUCAO,
	type TipoDevolucaoNfe,
} from "@/util/cfop-devolucao-util";
import { emitirNfe, abrirDanfeNfe, buscarNfeEmitidaComItens, resolverReferenciaEmissao } from "@/services/nfe-emissao.service";
import { davService } from "@/services/dav.service";
import { entidadesService } from "@/services/entidades.service";
import { cfopService } from "@/services/cfop.service";
import {
	nfeConfiguracaoService,
	type NfeSerie,
} from "@/services/nfe-configuracao.service";
import { empresaFiscalService } from "@/services/empresa-fiscal.service";
import { NFE_STATUS, NFE_AMBIENTE_LABELS, emissaoFoiAutorizada } from "@/constants/nfe-status";
import { obterCodigoRejeicaoNota, obterMotivoRejeicaoNota } from "@/util/nfe-rejeicao-util";
import { AvisoAmbienteNfe } from "../components/aviso-ambiente-nfe";
import { ModalItemEmissao } from "../components/modal-item-emissao";
import { PainelCalculoImpostosEmissao } from "../components/painel-calculo-impostos-emissao";
import { ResumoDestinatarioNfe } from "../components/resumo-destinatario-nfe";
import { ModalConfirmacaoProducao } from "../components/modal-confirmacao-producao";
import { SecaoDocumentoReferenciado } from "../components/secao-documento-referenciado";
import { CamposIntegracaoNfVenda } from "../components/campos-integracao-nf-venda";
import type { DocumentoReferenciadoResolvido } from "@/services/nfe-emissao.service";
import {
	calcularTotaisFiscaisEmissaoNfe,
	calcularIcmsItemEmissao,
} from "@/util/calcular-totais-fiscais-emissao-nfe";
import {
	empresaUsaCsosn,
	mapearItemNotaReemissaoParaForm,
	prepararItemEmissaoFormulario,
} from "@/util/mapear-produto-item-nfe";
import { extrairPrimeiraMensagemErroForm } from "@/util/extrair-mensagem-erro-form";
import { montarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe";
import { resolverContextoReemissaoNfe } from "@/util/resolver-contexto-reemissao-nfe";
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

const FORMAS_PAGAMENTO = [
	{ codigo: "01", descricao: "Dinheiro" },
	{ codigo: "02", descricao: "Cheque" },
	{ codigo: "03", descricao: "Cartão de Crédito" },
	{ codigo: "04", descricao: "Cartão de Débito" },
	{ codigo: "05", descricao: "Crédito Loja" },
	{ codigo: "10", descricao: "Vale Alimentação" },
	{ codigo: "11", descricao: "Vale Refeição" },
	{ codigo: "15", descricao: "Boleto Bancário" },
	{ codigo: "17", descricao: "PIX" },
	{ codigo: "90", descricao: "Sem Pagamento" },
	{ codigo: "99", descricao: "Outros" },
];

const formatarMoeda = (v: number) =>
	new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function montarPayloadIntegracaoEmissao(
	dados: EmissaoNfeFormData,
	totalNF: number,
	isOperacaoDevolucao: boolean,
): Pick<
	EmissaoNfeFormData,
	| "idtipodocumento"
	| "idcondicaopagto"
	| "idplanocontas"
	| "idlocalestoque"
	| "formasPagamento"
	| "gerarFinanceiro"
	| "gerarEstoque"
> {
	const gerarEstoque = dados.gerarEstoque ?? true;
	const gerarFinanceiro = isOperacaoDevolucao
		? false
		: (dados.gerarFinanceiro ?? true);

	const payload: Pick<
		EmissaoNfeFormData,
		| "idtipodocumento"
		| "idcondicaopagto"
		| "idplanocontas"
		| "idlocalestoque"
		| "formasPagamento"
		| "gerarFinanceiro"
		| "gerarEstoque"
	> = {
		gerarFinanceiro,
		gerarEstoque,
	};

	if (dados.idlocalestoque) {
		payload.idlocalestoque = dados.idlocalestoque;
	}

	if (!isOperacaoDevolucao && gerarFinanceiro) {
		if (dados.idtipodocumento) {
			payload.idtipodocumento = dados.idtipodocumento;
			payload.formasPagamento = [
				{
					idtipodocumentofinanceiro: dados.idtipodocumento,
					valor: totalNF,
				},
			];
		}
		if (dados.idcondicaopagto) {
			payload.idcondicaopagto = dados.idcondicaopagto;
		}
		if (dados.idplanocontas) {
			payload.idplanocontas = dados.idplanocontas;
		}
	}

	return payload;
}

export default function NovaEmissaoNfePage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const reemitirId = searchParams.get("reemitir");
	const pedidoId = searchParams.get("pedido");
	const devolverEntradaId = searchParams.get("devolverEntrada");
	const devolverVendaId = searchParams.get("devolverVenda");
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { nfeConfiguracao, carregando: carregandoNfeConfig } = useNfeConfiguracao(empresa?.id);

	const { data: empresaFiscal } = useQuery({
		queryKey: ["empresa-fiscal", empresa?.id],
		queryFn: () => empresaFiscalService.buscar(empresa!.id),
		enabled: !!empresa?.id,
	});
	const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
	const [modalItemAberto, setModalItemAberto] = useState(false);
	const [itemEditando, setItemEditando] = useState<{ index: number } | null>(null);
	const [formaPagamento, setFormaPagamento] = useState("01");
	const [cfopSaida, setCfopSaida] = useState("");
	const [cfopDialogAberto, setCfopDialogAberto] = useState(false);
	const [cfopPendente, setCfopPendente] = useState<string | null>(null);
	const reemitirAplicadoRef = useRef<string | null>(null);
	const pedidoAplicadoRef = useRef<string | null>(null);
	const devolucaoAplicadaRef = useRef<string | null>(null);
	const ultimaPreferenciaAplicadaRef = useRef(false);

	const { data: entidadesLista } = useQuery({
		queryKey: ["entidades-para-nfe", empresa?.id],
		queryFn: () =>
			entidadesService.listarTodos({
				idempresa: empresa?.id ?? "",
			}),
		enabled: !!empresa,
	});

	const { data: cfopsSaida } = useQuery({
		queryKey: ["cfops-saida-nfe", empresa?.id],
		queryFn: () =>
			cfopService.listarTodos({
				idempresa: empresa?.id ?? "",
				tipomovimento: "S",
			}),
		enabled: !!empresa,
	});

	const { data: cfopsEntrada } = useQuery({
		queryKey: ["cfops-entrada-nfe", empresa?.id],
		queryFn: () =>
			cfopService.listarTodos({
				idempresa: empresa?.id ?? "",
				tipomovimento: "E",
			}),
		enabled: !!empresa,
	});

	const { data: seriesData } = useQuery({
		queryKey: ["nfe-series", empresa?.id],
		queryFn: () => nfeConfiguracaoService.listarSeries(empresa?.id ?? ""),
		enabled: !!empresa,
	});

	const { data: dadosReemitir, isLoading: carregandoReemissao } = useQuery({
		queryKey: ["nfe-reemitir", reemitirId],
		queryFn: async () => {
			if (!reemitirId) {
				throw new Error("NF-e para reemissão não informada");
			}
			return buscarNfeEmitidaComItens(reemitirId);
		},
		enabled: !!reemitirId,
		staleTime: 0,
		refetchOnMount: "always",
	});

	const { data: contextoPedido, isLoading: carregandoPedido, isError: erroContextoPedido } = useQuery({
		queryKey: ["pedido-contexto-emissao", pedidoId, empresa?.id],
		queryFn: async () => {
			if (!pedidoId || !empresa) {
				throw new Error("Pedido não informado");
			}
			return davService.resolverContextoEmissaoNfe(pedidoId, empresa.id);
		},
		enabled: !!pedidoId && !!empresa?.id,
		staleTime: 0,
		refetchOnMount: "always",
		retry: false,
	});

	const form = useForm<EmissaoNfeFormData>({
		resolver: zodResolver(emissaoNfeFormSchema),
		defaultValues: {
			idempresa: empresa?.id ?? "",
			idnotafiscal: undefined,
			confirmarProducao: false,
			natOp: "",
			itens: [],
			totais: { frete: 0, seguro: 0, desconto: 0, outrasDespesas: 0 },
			gerarFinanceiro: true,
			gerarEstoque: true,
		},
	});

	const { formState: { errors } } = form;
	const itensValue = form.watch("itens");
	const [freteWatch, seguroWatch, descontoWatch, outrasDespesasWatch] =
		form.watch([
			"totais.frete",
			"totais.seguro",
			"totais.desconto",
			"totais.outrasDespesas",
		]);
	const idDestinatario = form.watch("iddestinatario");
	const idSerie = form.watch("idserienfe");
	const documentoReferenciado = form.watch("documentoReferenciado");
	const [
		idtipodocumentoWatch,
		idcondicaopagtoWatch,
		idplanocontasWatch,
		idlocalestoqueWatch,
		gerarFinanceiroWatch,
		gerarEstoqueWatch,
	] = form.watch([
		"idtipodocumento",
		"idcondicaopagto",
		"idplanocontas",
		"idlocalestoque",
		"gerarFinanceiro",
		"gerarEstoque",
	]);

	useEffect(() => {
		if (empresa?.id) {
			form.setValue("idempresa", empresa.id, { shouldValidate: true });
		}
	}, [empresa?.id, form]);

	const tipoDevolucaoForcado = useMemo<TipoDevolucaoNfe | null>(() => {
		if (devolverVendaId) return "venda";
		if (devolverEntradaId) return "compra";
		return null;
	}, [devolverEntradaId, devolverVendaId]);

	const tipoDevolucao = useMemo<TipoDevolucaoNfe | null>(() => {
		if (tipoDevolucaoForcado) return tipoDevolucaoForcado;
		if (cfopSaida) {
			const detectado = detectarTipoDevolucaoPorCfop(cfopSaida);
			if (detectado) return detectado;
		}
		for (const item of itensValue ?? []) {
			const detectado = detectarTipoDevolucaoPorCfop(item.cfop);
			if (detectado) return detectado;
		}
		return documentoReferenciado?.tipoDevolucao ?? null;
	}, [tipoDevolucaoForcado, cfopSaida, itensValue, documentoReferenciado?.tipoDevolucao]);

	const isOperacaoDevolucao = tipoDevolucao !== null || tipoDevolucaoForcado !== null;
	const isDevolucaoVenda = (tipoDevolucao ?? tipoDevolucaoForcado) === "venda";
	const tipoDevolucaoAtivo = tipoDevolucao ?? tipoDevolucaoForcado;

	useEffect(() => {
		if (isOperacaoDevolucao && formaPagamento !== "90") {
			setFormaPagamento("90");
		}
	}, [isOperacaoDevolucao, formaPagamento]);

	const entidades = useMemo(
		() =>
			(entidadesLista ?? []).filter((e) =>
				isDevolucaoVenda
					? Number(e.cliente) === 1
					: isOperacaoDevolucao
						? Number(e.fornecedor) === 1
						: Number(e.cliente) === 1,
			),
		[entidadesLista, isOperacaoDevolucao, isDevolucaoVenda],
	);
	const seriesAtivas = useMemo(
		() => (seriesData ?? []).filter((s: NfeSerie) => s.ativo && s.modelo === "55"),
		[seriesData],
	);

	const opcoesCfopOperacao = useMemo(() => {
		const lista = isDevolucaoVenda ? cfopsEntrada : cfopsSaida;
		const porCodigo = new Map<string, { value: string; label: string }>();

		for (const c of lista ?? []) {
			if (!c.codigo || porCodigo.has(c.codigo)) continue;
			porCodigo.set(c.codigo, {
				value: c.codigo,
				label: `${c.codigo} — ${c.descricao ?? ""}`,
			});
		}

		return Array.from(porCodigo.values()).sort((a, b) =>
			a.value.localeCompare(b.value),
		);
	}, [cfopsSaida, cfopsEntrada, isDevolucaoVenda]);

	useEffect(() => {
		if (reemitirId || pedidoId || devolverEntradaId || devolverVendaId) return;
		if (ultimaPreferenciaAplicadaRef.current) return;
		if (carregandoNfeConfig || !nfeConfiguracao) return;
		if (!cfopsSaida?.length || seriesData === undefined) return;

		const { ultimacfopsaida, ultimanatop, ultimaidserie } = nfeConfiguracao;
		if (!ultimacfopsaida && !ultimanatop && !ultimaidserie) return;

		ultimaPreferenciaAplicadaRef.current = true;

		if (ultimacfopsaida) {
			const cfopCadastrado = cfopsSaida.find((c) => c.codigo === ultimacfopsaida);
			if (cfopCadastrado) {
				setCfopSaida(ultimacfopsaida);
				form.setValue(
					"natOp",
					(ultimanatop?.trim() || cfopCadastrado.descricao || ultimacfopsaida).slice(
						0,
						60,
					),
					{ shouldValidate: true },
				);
			} else if (ultimanatop?.trim()) {
				form.setValue("natOp", ultimanatop.trim().slice(0, 60), {
					shouldValidate: true,
				});
			}
		} else if (ultimanatop?.trim()) {
			form.setValue("natOp", ultimanatop.trim().slice(0, 60), {
				shouldValidate: true,
			});
		}

		if (ultimaidserie && seriesAtivas.some((s) => s.id === ultimaidserie)) {
			form.setValue("idserienfe", ultimaidserie, { shouldValidate: true });
		}
	}, [
		reemitirId,
		pedidoId,
		devolverEntradaId,
		devolverVendaId,
		carregandoNfeConfig,
		nfeConfiguracao,
		cfopsSaida,
		seriesData,
		seriesAtivas,
		form,
	]);

	const entidadeSelecionada = useMemo(
		() => entidades.find((e) => e.id === idDestinatario),
		[entidades, idDestinatario],
	);

	const serieSelecionada = useMemo(
		() => seriesAtivas.find((s) => s.id === idSerie) ?? seriesAtivas.find((s) => s.padrao),
		[seriesAtivas, idSerie],
	);

	const notaReemitir = dadosReemitir?.notaFiscal;

	const reemitirProntoKey = useMemo(() => {
		if (
			!reemitirId ||
			!dadosReemitir?.notaFiscal?.id ||
			!empresa?.id ||
			!empresaFiscal ||
			seriesData === undefined ||
			cfopsSaida === undefined ||
			cfopsEntrada === undefined
		) {
			return null;
		}

		return [
			reemitirId,
			dadosReemitir.notaFiscal.id,
			empresa.id,
			empresaFiscal.crt,
			dadosReemitir.notaFiscal.codigostatusprotocolonfe ?? "",
			dadosReemitir.notaFiscal.codigostatustransmissaonfe ?? "",
			dadosReemitir.notaFiscal.mensagemtransmissaonfe ?? "",
			dadosReemitir.notaFiscal.datahoraemissao ?? "",
			dadosReemitir.notaFiscal.frete ?? "",
			dadosReemitir.notaFiscal.tipofrete ?? "",
			JSON.stringify(dadosReemitir.notaFiscal.dadosimportacao ?? null),
		].join(":");
	}, [
		reemitirId,
		dadosReemitir?.notaFiscal?.id,
		dadosReemitir?.notaFiscal?.codigostatusprotocolonfe,
		dadosReemitir?.notaFiscal?.codigostatustransmissaonfe,
		dadosReemitir?.notaFiscal?.mensagemtransmissaonfe,
		dadosReemitir?.notaFiscal?.datahoraemissao,
		dadosReemitir?.notaFiscal?.frete,
		dadosReemitir?.notaFiscal?.tipofrete,
		dadosReemitir?.notaFiscal?.dadosimportacao,
		empresa?.id,
		empresaFiscal,
		seriesData,
		cfopsSaida,
		cfopsEntrada,
	]);

	useEffect(() => {
		if (!reemitirProntoKey || !dadosReemitir || !empresa || !empresaFiscal) {
			return;
		}

		const { notaFiscal, itens } = dadosReemitir;

		if (reemitirAplicadoRef.current === reemitirProntoKey) return;

		if (notaFiscal.status === NFE_STATUS.AUTORIZADA) {
			toast.error("Esta NF-e já foi autorizada e não pode ser reemitida.");
			router.replace(`/nota-fiscal-venda/${notaFiscal.id}`);
			return;
		}

		const usaCsosn = empresaUsaCsosn(empresaFiscal.crt);
		const seriesAtivasReemissao = (seriesData ?? []).filter(
			(s) => s.ativo && s.modelo === "55",
		);

		const itensForm = itens.map((item) =>
			mapearItemNotaReemissaoParaForm(item, usaCsosn),
		);

		const primeiroCfop = itensForm[0]?.cfop;
		if (primeiroCfop) setCfopSaida(primeiroCfop);

		const contextoReemissao = resolverContextoReemissaoNfe(notaFiscal);
		const ehDevolucaoReemissao =
			notaFiscal.finalidadeemissaonfe === 4 ||
			!!notaFiscal.chavedocumentoreferenciado ||
			!!contextoReemissao.documentoReferenciado;
		setFormaPagamento(
			ehDevolucaoReemissao ? "90" : contextoReemissao.formaPagamento,
		);

		const cfopReemissao =
			cfopsSaida?.find((c) => c.codigo === primeiroCfop) ??
			cfopsEntrada?.find((c) => c.codigo === primeiroCfop);
		const natOpReemissao = (
			contextoReemissao.natOp?.trim() ||
			cfopReemissao?.descricao?.trim() ||
			(primeiroCfop ? `Venda CFOP ${primeiroCfop}` : "VENDA")
		).slice(0, 60);

		const serieEncontrada =
			(contextoReemissao.idserienfe
				? seriesAtivasReemissao.find((s) => s.id === contextoReemissao.idserienfe)
				: undefined) ??
			seriesAtivasReemissao.find((s) => {
				if (s.serie === notaFiscal.serie) return true;
				const numeroSerie = Number(s.serie);
				const numeroNota = Number(notaFiscal.serie);
				return (
					Number.isFinite(numeroSerie) &&
					Number.isFinite(numeroNota) &&
					numeroSerie === numeroNota
				);
			});

		reemitirAplicadoRef.current = reemitirProntoKey;

		form.reset({
			idempresa: empresa.id,
			idnotafiscal: notaFiscal.id,
			iddestinatario: notaFiscal.identidade ?? undefined,
			idserienfe: serieEncontrada?.id ?? contextoReemissao.idserienfe ?? undefined,
			confirmarProducao: false,
			natOp: natOpReemissao,
			itens: itensForm,
			totais: contextoReemissao.totais,
			transporte: contextoReemissao.transporte,
			informacoesAdicionais: contextoReemissao.informacoesAdicionais,
			documentoReferenciado: contextoReemissao.documentoReferenciado,
			idtipodocumento: contextoReemissao.idtipodocumento,
			idcondicaopagto: contextoReemissao.idcondicaopagto,
			idplanocontas: contextoReemissao.idplanocontas,
			idlocalestoque: contextoReemissao.idlocalestoque,
			gerarFinanceiro: ehDevolucaoReemissao
				? false
				: contextoReemissao.gerarFinanceiro,
			gerarEstoque: contextoReemissao.gerarEstoque,
		});
		// Executa uma vez quando todos os dados da reemissão estiverem prontos.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- chave estável evita reexecução em refetch.
	}, [reemitirProntoKey]);

	const pedidoProntoKey = useMemo(() => {
		if (
			!pedidoId ||
			!contextoPedido?.iddav ||
			!empresa?.id ||
			!empresaFiscal ||
			cfopsSaida === undefined
		) {
			return null;
		}

		return [
			pedidoId,
			contextoPedido.iddav,
			empresa.id,
			contextoPedido.itens.length,
			contextoPedido.pendencias.join("|"),
		].join(":");
	}, [
		pedidoId,
		contextoPedido?.iddav,
		contextoPedido?.itens.length,
		contextoPedido?.pendencias,
		empresa?.id,
		empresaFiscal,
		cfopsSaida,
	]);

	useEffect(() => {
		if (!pedidoProntoKey || !contextoPedido || !empresa || !empresaFiscal) {
			return;
		}

		if (pedidoAplicadoRef.current === pedidoProntoKey) return;

		if (contextoPedido.pendencias.length > 0) {
			toast.error("Pedido com pendências para emissão", {
				description: contextoPedido.pendencias.join("; "),
			});
		}

		if (contextoPedido.itens.length === 0) {
			return;
		}

		const usaCsosn = empresaUsaCsosn(empresaFiscal.crt);
		const itensForm = contextoPedido.itens.map((item) =>
			prepararItemEmissaoFormulario(
				{
					idproduto: item.idproduto,
					codigoProduto: item.codigoProduto,
					descricao: item.descricao,
					ncm: item.ncm,
					cfop: item.cfop,
					unidade: item.unidade,
					quantidade: item.quantidade,
					valorUnitario: item.valorUnitario,
					cst: item.cst,
					csosn: item.csosn,
					orig: item.orig ?? 0,
				},
				usaCsosn,
			),
		);

		const primeiroCfop = itensForm[0]?.cfop;
		if (primeiroCfop) {
			setCfopSaida(primeiroCfop);
			const cfop = cfopsSaida?.find((c) => c.codigo === primeiroCfop);
			form.setValue(
				"natOp",
				(cfop?.descricao?.trim() || `Venda CFOP ${primeiroCfop}`).slice(0, 60),
				{ shouldValidate: true },
			);
		}

		if (contextoPedido.formaPagamentoNfe) {
			setFormaPagamento(contextoPedido.formaPagamentoNfe);
		}

		pedidoAplicadoRef.current = pedidoProntoKey;

		form.reset({
			idempresa: empresa.id,
			iddav: contextoPedido.iddav,
			iddestinatario: contextoPedido.iddestinatario,
			confirmarProducao: false,
			natOp: form.getValues("natOp"),
			itens: itensForm,
			totais: {
				frete: 0,
				seguro: 0,
				desconto: contextoPedido.totais?.desconto ?? 0,
				outrasDespesas: 0,
			},
			informacoesAdicionais: contextoPedido.informacoesAdicionais,
			idtipodocumento: contextoPedido.idtipodocumento,
			idcondicaopagto: contextoPedido.idcondicaopagto,
			idlocalestoque: contextoPedido.idlocalestoque,
			gerarFinanceiro: contextoPedido.gerarFinanceiro,
			gerarEstoque: contextoPedido.gerarEstoque,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- chave estável evita reexecução em refetch.
	}, [pedidoProntoKey]);

	const cfopsOperacao = isDevolucaoVenda ? cfopsEntrada : cfopsSaida;

	const codigoRejeicaoAnterior = notaReemitir
		? obterCodigoRejeicaoNota(notaReemitir)
		: null;
	const motivoRejeicaoAnterior = notaReemitir
		? obterMotivoRejeicaoNota(notaReemitir)
		: null;

	const opcoesDestinatario = useMemo(
		() => [
			{ value: "_nenhum", label: "Consumidor Final (sem identificação)" },
			...entidades.map((e) => ({
				value: e.id,
				label: `${e.razaosocial ?? e.nome} — ${e.cnpjcpf}`,
			})),
		],
		[entidades],
	);

	function aplicarCfopNatureza(codigo: string, propagarItens: boolean) {
		setCfopSaida(codigo);
		const cfop = cfopsOperacao?.find((c) => c.codigo === codigo);
		form.setValue(
			"natOp",
			(cfop?.descricao ?? codigo).slice(0, 60),
			{ shouldValidate: true },
		);
		if (tipoDevolucao) {
			form.setValue("documentoReferenciado", {
				...form.getValues("documentoReferenciado"),
				tipoDevolucao,
			});
		}
		if (propagarItens) {
			const itens = form.getValues("itens") ?? [];
			if (itens.length > 0) {
				form.setValue(
					"itens",
					itens.map((item) => ({ ...item, cfop: codigo })),
				);
			}
		}
	}

	function selecionarCfopSaida(codigo: string) {
		const itens = form.getValues("itens") ?? [];
		const itensComCfopDiferente = itens.filter((item) => item.cfop !== codigo);

		if (itens.length > 0 && itensComCfopDiferente.length > 0) {
			setCfopPendente(codigo);
			setCfopDialogAberto(true);
			return;
		}

		aplicarCfopNatureza(codigo, false);
	}

	function confirmarPropagacaoCfop(propagar: boolean) {
		if (cfopPendente) {
			aplicarCfopNatureza(cfopPendente, propagar);
		}
		setCfopDialogAberto(false);
		setCfopPendente(null);
	}

	function aplicarReferenciaResolvida(dados: DocumentoReferenciadoResolvido) {
		if (dados.iddestinatarioSugerido) {
			form.setValue("iddestinatario", dados.iddestinatarioSugerido);
		}

		if (dados.itensSugeridos && dados.itensSugeridos.length > 0) {
			const itensImportados = dados.itensSugeridos.map((item) => ({
				idproduto: item.idproduto,
				codigoProduto: item.codigoProduto,
				descricao: item.descricao,
				ncm: item.ncm,
				cfop: item.cfop,
				unidade: item.unidade,
				quantidade: item.quantidade,
				valorUnitario: item.valorUnitario,
				orig: item.orig ?? 0,
				cst: item.situacaotributaria,
				cstPis: item.cstpis,
				cstCofins: item.cstcofins,
				valorIpi: item.valorIpi,
				valorIpiDevol: item.valorIpiDevol,
				baseIcms: item.baseIcms,
				aliquotaIcms: item.aliquotaIcms,
				valorIcms: item.valorIcms,
				baseIcmsSt: item.baseIcmsSt,
				valorIcmsSt: item.valorIcmsSt,
				valorFcpSt: item.valorFcpSt,
				valorFcpStRet: item.valorFcpStRet,
				valorIcmsDesonerado: item.valorIcmsDesonerado,
				valorIcmsMonoRet: item.valorIcmsMonoRet,
				valorIcmsMonoReten: item.valorIcmsMonoReten,
			}));

			form.setValue("itens", itensImportados);

			const cfopAtual = cfopSaida;
			const diverge =
				!!cfopAtual && itensImportados.some((item) => item.cfop !== cfopAtual);

			if (diverge) {
				setCfopPendente(cfopAtual);
				setCfopDialogAberto(true);
			} else {
				const primeiroCfop = itensImportados[0]?.cfop;
				if (primeiroCfop) {
					aplicarCfopNatureza(primeiroCfop, false);
				}
			}

			toast.info("Itens importados da nota referenciada", {
				description: `${itensImportados.length} item(ns) adicionados.`,
			});
		}
	}

	useEffect(() => {
		if (!empresa?.id) return;

		const notaId = devolverEntradaId ?? devolverVendaId;
		const tipo = devolverVendaId ? "venda" : "compra";
		if (!notaId) return;
		if (devolucaoAplicadaRef.current === notaId) return;

		devolucaoAplicadaRef.current = notaId;

		void resolverReferenciaEmissao({
			idempresa: empresa.id,
			tipoDevolucao: tipo,
			idnotafiscalReferenciada: notaId,
		})
			.then((dados) => {
				form.setValue("documentoReferenciado", {
					tipoDevolucao: tipo,
					idnotafiscalReferenciada: dados.idnotafiscalReferenciada,
					chaveNfe: dados.chave,
				});
				aplicarReferenciaResolvida(dados);
				setFormaPagamento("90");
			})
			.catch((erro) => {
				toast.error("Erro ao carregar nota para devolução", {
					description: erro instanceof Error ? erro.message : "Erro desconhecido",
				});
			});
	}, [devolverEntradaId, devolverVendaId, empresa?.id, form]);

	function adicionarItem(novoItem: import("@/schemas/nfe-emissao.schema").ItemNfe) {
		if (itemEditando !== null) {
			const novosItens = itensValue.map((it, i) =>
				i === itemEditando.index ? novoItem : it,
			);
			form.setValue("itens", novosItens, { shouldDirty: true });
			setItemEditando(null);
		} else {
			form.setValue("itens", [...itensValue, novoItem], { shouldDirty: true });
		}
	}

	function removerItem(index: number) {
		form.setValue(
			"itens",
			itensValue.filter((_, i) => i !== index),
		);
	}

	function abrirEdicao(index: number) {
		setItemEditando({ index });
		setModalItemAberto(true);
	}

	function abrirModalItem() {
		if (!cfopSaida) {
			toast.error("Selecione o CFOP de saída antes de adicionar itens.");
			return;
		}
		setItemEditando(null);
		setModalItemAberto(true);
	}

	const itensImpostosKey = useMemo(
		() =>
			JSON.stringify(
				(itensValue ?? []).map((item) => ({
					quantidade: item.quantidade,
					valorUnitario: item.valorUnitario,
					cst: item.cst,
					csosn: item.csosn,
					cstPis: item.cstPis,
					cstCofins: item.cstCofins,
					aliquotaPis: item.aliquotaPis,
					aliquotaCofins: item.aliquotaCofins,
					baseIcms: item.baseIcms,
					aliquotaIcms: item.aliquotaIcms,
					valorIcms: item.valorIcms,
					valorIpi: item.valorIpi,
					valorIpiDevol: item.valorIpiDevol,
					baseIcmsSt: item.baseIcmsSt,
					valorIcmsSt: item.valorIcmsSt,
					valorFcpSt: item.valorFcpSt,
					valorFcpStRet: item.valorFcpStRet,
					valorIcmsDesonerado: item.valorIcmsDesonerado,
					valorIcmsMonoRet: item.valorIcmsMonoRet,
					valorIcmsMonoReten: item.valorIcmsMonoReten,
				})),
			),
		[itensValue],
	);

	const totaisFiscais = useMemo(
		() =>
			calcularTotaisFiscaisEmissaoNfe(
				empresaFiscal?.crt ?? 3,
				itensValue ?? [],
				{
					frete: freteWatch,
					seguro: seguroWatch,
					desconto: descontoWatch,
					outrasDespesas: outrasDespesasWatch,
				},
			),
		[
			empresaFiscal?.crt,
			itensImpostosKey,
			freteWatch,
			seguroWatch,
			descontoWatch,
			outrasDespesasWatch,
		],
	);

	const totalProdutos = totaisFiscais.totalProdutos;
	const totalFrete = totaisFiscais.frete;
	const totalDesconto = totaisFiscais.desconto;
	const totalNF = totaisFiscais.totalNota;

	const { mutate: emitir, isPending } = useMutation({
		mutationFn: emitirNfe,
		onSuccess: (resultado) => {
			if (resultado.pendencias && resultado.pendencias.length > 0) {
				toast.error("Pré-requisitos incompletos", {
					description: resultado.pendencias.map((p) => p.mensagem).join("; "),
				});
				return;
			}

			void queryClient.invalidateQueries({ queryKey: ["nfe-emitidas"] });
			void queryClient.invalidateQueries({
				queryKey: ["nfe-configuracao", empresa?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: ["nfe-reemitir", resultado.idnotafiscal],
			});
			void queryClient.invalidateQueries({
				queryKey: ["nfe-detalhe", resultado.idnotafiscal],
			});
			void queryClient.invalidateQueries({
				queryKey: ["nfe-itens", resultado.idnotafiscal],
			});
			if (pedidoId) {
				void queryClient.invalidateQueries({ queryKey: ["pedido", pedidoId] });
				void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
				void queryClient.invalidateQueries({ queryKey: ["pedido-itens", pedidoId] });
			}

			if (!emissaoFoiAutorizada(resultado)) {
				toast.error(
					`NF-e rejeitada${resultado.cStat ? ` (código ${resultado.cStat})` : ""}`,
					{
						description: resultado.xMotivo ?? "Verifique os dados e tente novamente.",
					},
				);
				router.push(`/nota-fiscal-venda/${resultado.idnotafiscal}`);
				return;
			}

			toast.success("NF-e emitida com sucesso!", {
				description: resultado.chave
					? `Chave: ${resultado.chave}`
					: undefined,
			});

			if (resultado.integracao) {
				const { parcelasGeradas, lancamentosCaixa, movimentosGerados, avisos } =
					resultado.integracao;
				const partes: string[] = [];
				if (movimentosGerados > 0) {
					partes.push(`${movimentosGerados} movimento(s) de estoque`);
				}
				if (parcelasGeradas > 0) {
					partes.push(`${parcelasGeradas} parcela(s) a receber`);
				}
				if (lancamentosCaixa > 0) {
					partes.push(`${lancamentosCaixa} lançamento(s) no caixa`);
				}
				if (partes.length > 0) {
					toast.info("Integração operacional concluída", {
						description: partes.join("; "),
					});
				}
				if (avisos.length > 0) {
					toast.warning("Integração com avisos", {
						description: avisos.join("; "),
					});
				}
			}

			void abrirDanfeNfe(resultado.idnotafiscal).catch((erro) => {
				toast.warning("NF-e emitida, mas não foi possível abrir o DANFE", {
					description:
						erro instanceof Error ? erro.message : "Erro desconhecido",
				});
			});

			router.push(`/nota-fiscal-venda/${resultado.idnotafiscal}`);
		},
		onError: (erro) => {
			toast.error("Erro ao emitir NF-e", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	function handleInvalidSubmit(erros: FieldErrors<EmissaoNfeFormData>) {
		const mensagem =
			extrairPrimeiraMensagemErroForm(erros) ??
			"Verifique os campos obrigatórios da nota.";
		toast.error("Não foi possível emitir a NF-e", {
			description: mensagem,
		});
	}

	function handleSubmit(dados: EmissaoNfeFormData) {
		if (!cfopSaida) {
			toast.error("Selecione o CFOP de saída (natureza da operação).");
			return;
		}

		if (!empresa?.id) {
			toast.error("Selecione uma empresa para emitir a NF-e.");
			return;
		}

		const usaCsosn = empresaUsaCsosn(empresaFiscal?.crt ?? 3);
		const dadosNormalizados: EmissaoNfeFormData = {
			...dados,
			idempresa: empresa.id,
			idnotafiscal: reemitirId
				? dados.idnotafiscal ?? reemitirId
				: dados.idnotafiscal,
			itens: dados.itens.map((item) =>
				prepararItemEmissaoFormulario(item, usaCsosn),
			),
		};

		if (isOperacaoDevolucao) {
			const chave =
				dadosNormalizados.documentoReferenciado?.chaveNfe?.replace(/\D/g, "") ??
				"";
			if (
				chave.length !== 44 &&
				!dadosNormalizados.documentoReferenciado?.idnotafiscalReferenciada
			) {
				toast.error(
					`${
						LABEL_TIPO_DEVOLUCAO[tipoDevolucaoAtivo ?? "compra"]
					} exige referência à NF-e original. Valide a nota, chave ou XML.`,
				);
				return;
			}
		}

		const cfopSelecionado = cfopsOperacao?.find((c) => c.codigo === cfopSaida);
		const natOp =
			dadosNormalizados.natOp?.trim() ||
			cfopSelecionado?.descricao?.trim()?.slice(0, 60) ||
			`Venda CFOP ${cfopSaida}`.slice(0, 60);

		const dadosComPagamento = {
			...dadosNormalizados,
			natOp,
			documentoReferenciado: isOperacaoDevolucao
				? {
						...dadosNormalizados.documentoReferenciado,
						tipoDevolucao: tipoDevolucaoAtivo ?? undefined,
					}
				: dadosNormalizados.documentoReferenciado,
			pagamento: montarPagamentoEmissaoNfe(formaPagamento, totalNF, {
				forcarSemPagamento: isOperacaoDevolucao,
			}),
			...montarPayloadIntegracaoEmissao(
				dadosNormalizados,
				totalNF,
				isOperacaoDevolucao,
			),
		};

		if (
			!isOperacaoDevolucao &&
			dadosComPagamento.gerarFinanceiro &&
			!dadosComPagamento.idtipodocumento &&
			!dadosComPagamento.idcondicaopagto
		) {
			toast.error(
				"Informe o meio de pagamento (ERP) ou a condição de pagamento para gerar o financeiro.",
			);
			return;
		}

		if (nfeConfiguracao?.ambiente === 1 && !dadosNormalizados.confirmarProducao) {
			setModalConfirmacaoAberto(true);
			return;
		}

		emitir(dadosComPagamento);
	}

	function handleConfirmarProducao() {
		setModalConfirmacaoAberto(false);
		const dados = form.getValues();
		const usaCsosn = empresaUsaCsosn(empresaFiscal?.crt ?? 3);
		const cfopSelecionado = cfopsOperacao?.find((c) => c.codigo === cfopSaida);
		const natOp =
			dados.natOp?.trim() ||
			cfopSelecionado?.descricao?.trim()?.slice(0, 60) ||
			`Venda CFOP ${cfopSaida}`.slice(0, 60);

		emitir({
			...dados,
			idempresa: empresa?.id ?? dados.idempresa,
			idnotafiscal: reemitirId
				? dados.idnotafiscal ?? reemitirId
				: dados.idnotafiscal,
			itens: (dados.itens ?? []).map((item) =>
				prepararItemEmissaoFormulario(item, usaCsosn),
			),
			natOp,
			confirmarProducao: true,
			documentoReferenciado: isOperacaoDevolucao
				? {
						...dados.documentoReferenciado,
						tipoDevolucao: tipoDevolucaoAtivo ?? undefined,
					}
				: dados.documentoReferenciado,
			pagamento: montarPagamentoEmissaoNfe(formaPagamento, totalNF, {
				forcarSemPagamento: isOperacaoDevolucao,
			}),
			...montarPayloadIntegracaoEmissao(dados, totalNF, isOperacaoDevolucao),
		});
	}

	if (!empresa) {
		return (
			<div className="flex flex-1 items-center justify-center py-16">
				<p className="text-muted-foreground">
					Selecione uma empresa para emitir uma NF-e.
				</p>
			</div>
		);
	}

	const ambienteLabel =
		nfeConfiguracao?.ambiente
			? NFE_AMBIENTE_LABELS[nfeConfiguracao.ambiente] ?? "—"
			: "Configuração pendente";

	return (
		<div className="flex flex-1 flex-col">
			{/* ── Cabeçalho da página ─────────────────────────────────────────── */}
			<div className="border-b bg-background px-4 sm:px-6 py-4 flex items-center gap-3">
				<Button variant="ghost" size="icon" asChild>
					<Link href={pedidoId ? `/pedidos/${pedidoId}` : "/nota-fiscal-venda"}>
						<ArrowLeft className="h-5 w-5" />
					</Link>
				</Button>
				<div className="flex-1 min-w-0">
					<h1 className="text-lg font-semibold leading-tight">
						{reemitirId && notaReemitir
							? `Reemitir NF-e ${notaReemitir.serie}-${notaReemitir.numeronotafiscal}`
							: pedidoId
								? "Emitir NF-e do pedido"
								: "Nova NF-e — Modelo 55"}
					</h1>
					<p className="text-xs text-muted-foreground truncate">
						{reemitirId && notaReemitir
							? `Mesma numeração: série ${notaReemitir.serie}, nº ${notaReemitir.numeronotafiscal}`
							: pedidoId
								? `Pedido ${pedidoId.slice(0, 8)} · revise e transmita a NF-e`
								: serieSelecionada
								? `Série ${serieSelecionada.serie} · Próximo nº ${serieSelecionada.numeroproximo}`
								: "Nenhuma série selecionada"}
						{" · "}
						<span
							className={
								nfeConfiguracao?.ambiente === 1
									? "text-red-600 font-medium"
									: "text-yellow-600 font-medium"
							}
						>
							{ambienteLabel}
						</span>
					</p>
				</div>
			</div>

			{/* ── Conteúdo rolável ────────────────────────────────────────────── */}
			<div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 pb-24 space-y-0">
				{pedidoId && (
					<div
						className={`mb-6 rounded-lg border p-4 text-sm space-y-2 ${
							erroContextoPedido || (!carregandoPedido && contextoPedido?.itens.length === 0)
								? "border-destructive/40 bg-destructive/5 text-destructive"
								: "border-blue-200 bg-blue-50 text-blue-950"
						}`}
					>
						<p className="font-medium">
							{carregandoPedido
								? "Carregando dados do pedido..."
								: erroContextoPedido
									? "Não foi possível carregar o pedido"
									: contextoPedido?.itens.length === 0
										? "Pedido sem itens válidos para emissão"
										: "Dados importados do pedido"}
						</p>
						{!carregandoPedido && erroContextoPedido && (
							<p>
								Verifique se o pedido está salvo e tente novamente pelo botão
								Faturar.
							</p>
						)}
						{!carregandoPedido &&
							!erroContextoPedido &&
							contextoPedido?.pendencias.length ? (
							<p className="text-destructive">
								{contextoPedido.pendencias.join("; ")}
							</p>
						) : null}
						{!carregandoPedido &&
							!erroContextoPedido &&
							(contextoPedido?.itens.length ?? 0) > 0 && (
							<p className="text-blue-800">
								Revise cliente, itens, pagamento e tributação antes de emitir.
								Ao autorizar, o pedido será vinculado à NF-e.
							</p>
						)}
					</div>
				)}
				{reemitirId && (
					<div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
						<p className="font-medium">
							{carregandoReemissao
								? "Carregando dados da NF-e para reemissão..."
								: "Você está corrigindo e reemitindo a mesma NF-e. A numeração será mantida."}
						</p>
						{!carregandoReemissao && (codigoRejeicaoAnterior || motivoRejeicaoAnterior) && (
							<div className="text-xs leading-relaxed">
								{codigoRejeicaoAnterior && (
									<p>
										<span className="font-medium">Rejeição anterior:</span>{" "}
										código {codigoRejeicaoAnterior}
									</p>
								)}
								{motivoRejeicaoAnterior && <p>{motivoRejeicaoAnterior}</p>}
							</div>
						)}
					</div>
				)}
				{nfeConfiguracao && (
					<AvisoAmbienteNfe
						ambiente={nfeConfiguracao.ambiente}
						className="mb-6"
					/>
				)}

				<form
					id="form-emissao-nfe"
					onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
					className="space-y-0"
				>
					{/* ── 1. IDENTIFICAÇÃO ──────────────────────────────────────────── */}
					<FieldGroup>
						<FieldSet>
							<FieldLegend>1. Identificação</FieldLegend>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<Field>
									<FieldLabel>Série NF-e</FieldLabel>
									<Controller
										control={form.control}
										name="idserienfe"
										render={({ field }) => (
											<Select
												value={field.value ?? "_padrao"}
												onValueChange={(valor) =>
													field.onChange(valor === "_padrao" ? undefined : valor)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Usar série padrão" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="_padrao">Usar série padrão</SelectItem>
													{seriesAtivas.map((s) => (
														<SelectItem key={s.id} value={s.id}>
															Série {s.serie}
															{s.padrao && " (padrão)"}
															{" — próximo nº "}
															{s.numeroproximo}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</Field>

								<Field data-invalid={!cfopSaida}>
									<FieldLabel>
										{isDevolucaoVenda
											? "Natureza da operação (CFOP de entrada — devolução)"
											: "Natureza da operação (CFOP de saída)"}
									</FieldLabel>
									<Combobox
										options={opcoesCfopOperacao}
										value={cfopSaida}
										onChange={selecionarCfopSaida}
										placeholder="Selecionar CFOP de saída..."
										searchPlaceholder="Buscar por código ou descrição..."
										emptyMessage="Nenhum CFOP de saída encontrado."
									/>
									{form.watch("natOp") && (
										<p className="text-xs text-muted-foreground mt-1">
											{form.watch("natOp")}
										</p>
									)}
									{!cfopSaida && (
										<p className="text-xs text-destructive mt-1">
											Selecione o CFOP de saída para definir a natureza da operação.
										</p>
									)}
								</Field>
							</div>
						</FieldSet>
					</FieldGroup>

					{isOperacaoDevolucao && empresa?.id && tipoDevolucaoAtivo && (
						<>
							<Separator className="my-6" />
							<SecaoDocumentoReferenciado
								idempresa={empresa.id}
								tipoDevolucao={tipoDevolucaoAtivo}
								notaReferenciadaInicial={devolverEntradaId ?? devolverVendaId ?? undefined}
								valor={documentoReferenciado}
								onChange={(valor) =>
									form.setValue("documentoReferenciado", valor)
								}
								onResolvido={aplicarReferenciaResolvida}
							/>
						</>
					)}

					<Separator className="my-6" />

					{/* ── 2. DESTINATÁRIO ────────────────────────────────────────────── */}
					<FieldGroup>
						<FieldSet>
							<FieldLegend>
								2. Destinatário
								{isOperacaoDevolucao && (
									<span className="ml-2 text-xs font-normal text-muted-foreground">
										({isDevolucaoVenda ? "cliente" : "fornecedor"})
									</span>
								)}
							</FieldLegend>
							<Field data-invalid={!!errors.iddestinatario}>
								<FieldLabel>
									{isDevolucaoVenda
										? "Cliente"
										: isOperacaoDevolucao
											? "Fornecedor"
											: "Cliente / Destinatário"}
								</FieldLabel>
								<Controller
									control={form.control}
									name="iddestinatario"
									render={({ field }) => (
										<Combobox
											options={opcoesDestinatario}
											value={field.value ?? "_nenhum"}
											onChange={(v) =>
												field.onChange(v === "_nenhum" ? undefined : v)
											}
											placeholder={
												isDevolucaoVenda
													? "Selecionar cliente..."
													: isOperacaoDevolucao
														? "Selecionar fornecedor..."
														: "Selecionar destinatário..."
											}
											searchPlaceholder="Buscar por nome ou CNPJ..."
											emptyMessage={
												isDevolucaoVenda
													? "Nenhum cliente encontrado."
													: isOperacaoDevolucao
														? "Nenhum fornecedor encontrado."
														: "Nenhum cliente encontrado."
											}
										/>
									)}
								/>
								<FieldError errors={[errors.iddestinatario]} />
							</Field>

							{entidadeSelecionada && (
								<div className="rounded-lg border bg-muted/40 px-4 py-3">
									<ResumoDestinatarioNfe
										dados={entidadeSelecionada}
										variant="compact"
									/>
								</div>
							)}
						</FieldSet>
					</FieldGroup>

					<Separator className="my-6" />

					{/* ── 3. PRODUTOS / SERVIÇOS ─────────────────────────────────────── */}
					<FieldGroup>
						<FieldSet>
							<FieldLegend>3. Produtos / Serviços</FieldLegend>

							{/* Cabeçalho da tabela */}
							{itensValue.length > 0 && (
								<div className="hidden lg:grid grid-cols-[2rem_minmax(0,1fr)_3rem_4rem_5rem_5rem_5rem_5rem_4.5rem] gap-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
									<span>#</span>
									<span>Produto</span>
									<span className="text-center">UN</span>
									<span className="text-right">Qtd</span>
									<span className="text-right">Vlr Unit.</span>
									<span className="text-right">BC ICMS</span>
									<span className="text-right">ICMS</span>
									<span className="text-right">Total</span>
									<span />
								</div>
							)}

							{/* Lista de itens */}
							<div className="space-y-2">
								{itensValue.length === 0 && (
									<div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
										Nenhum item adicionado.{" "}
										<button
											type="button"
											className="underline hover:text-foreground transition-colors"
											onClick={abrirModalItem}
										>
											Adicionar primeiro item
										</button>
									</div>
								)}

								{itensValue.map((item, index) => {
									const total =
										(item.quantidade || 0) * (item.valorUnitario || 0);
									const icms = calcularIcmsItemEmissao(
										empresaFiscal?.crt ?? 3,
										item,
									);
									return (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: itens não têm id estável
											key={index}
											className="grid grid-cols-[2rem_minmax(0,1fr)_3rem_4rem_5rem_5rem_5rem_5rem_4.5rem] gap-2 items-center rounded-lg border bg-card px-3 py-2"
										>
											<span className="text-xs text-muted-foreground font-medium text-center">
												{index + 1}
											</span>
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">
													{item.descricao}
												</p>
												{item.cfop && (
													<p className="text-xs text-muted-foreground">
														CFOP {item.cfop}
														{item.ncm && ` · NCM ${item.ncm}`}
													</p>
												)}
											</div>
											<span className="text-sm text-center text-muted-foreground">
												{item.unidade}
											</span>
											<span className="text-sm text-right">
												{item.quantidade}
											</span>
											<span className="text-sm text-right">
												{formatarMoeda(item.valorUnitario)}
											</span>
											<span className="text-sm text-right text-muted-foreground">
												{formatarMoeda(icms.base)}
											</span>
											<span className="text-sm text-right text-muted-foreground">
												{formatarMoeda(icms.valor)}
											</span>
											<span className="text-sm font-semibold text-right">
												{formatarMoeda(total)}
											</span>
											<div className="flex items-center justify-end gap-1">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-muted-foreground hover:text-foreground"
													onClick={() => abrirEdicao(index)}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-muted-foreground hover:text-destructive"
													onClick={() => removerItem(index)}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									);
								})}
							</div>

							{/* Botão adicionar */}
							<div className="flex items-center justify-between">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="gap-2"
									onClick={abrirModalItem}
								>
									<Plus className="h-4 w-4" />
									Adicionar item
								</Button>
								{itensValue.length > 0 && (
									<span className="text-sm text-muted-foreground">
										Subtotal:{" "}
										<strong className="text-foreground">
											{formatarMoeda(totalProdutos)}
										</strong>
									</span>
								)}
							</div>

							{errors.itens && (
								<p className="text-sm text-destructive">
									{errors.itens.message ??
										extrairPrimeiraMensagemErroForm(
											errors.itens as FieldErrors<EmissaoNfeFormData>,
											"itens",
										)}
								</p>
							)}
						</FieldSet>
					</FieldGroup>

					<Separator className="my-6" />

					{/* ── 4. CÁLCULO DOS IMPOSTOS ─────────────────────────────────────── */}
					{itensValue.length > 0 && (
						<div className="mb-6">
							<PainelCalculoImpostosEmissao totaisFiscais={totaisFiscais} />
						</div>
					)}

					{/* ── 5. TOTAIS ───────────────────────────────────────────────────── */}
					<FieldGroup>
						<FieldSet>
							<FieldLegend>5. Totais</FieldLegend>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								<Field>
									<FieldLabel>Frete</FieldLabel>
									<Controller
										control={form.control}
										name="totais.frete"
										render={({ field }) => (
											<MoneyInput
												value={String(field.value ?? 0)}
												onChange={(v) =>
													field.onChange(v ? parseFloat(v) : 0)
												}
											/>
										)}
									/>
								</Field>
								<Field>
									<FieldLabel>Seguro</FieldLabel>
									<Controller
										control={form.control}
										name="totais.seguro"
										render={({ field }) => (
											<MoneyInput
												value={String(field.value ?? 0)}
												onChange={(v) =>
													field.onChange(v ? parseFloat(v) : 0)
												}
											/>
										)}
									/>
								</Field>
								<Field>
									<FieldLabel>Desconto</FieldLabel>
									<Controller
										control={form.control}
										name="totais.desconto"
										render={({ field }) => (
											<MoneyInput
												value={String(field.value ?? 0)}
												onChange={(v) =>
													field.onChange(v ? parseFloat(v) : 0)
												}
											/>
										)}
									/>
								</Field>
								<Field>
									<FieldLabel>Outras Despesas</FieldLabel>
									<Controller
										control={form.control}
										name="totais.outrasDespesas"
										render={({ field }) => (
											<MoneyInput
												value={String(field.value ?? 0)}
												onChange={(v) =>
													field.onChange(v ? parseFloat(v) : 0)
												}
											/>
										)}
									/>
								</Field>
							</div>

							{itensValue.length > 0 && (
								<div className="rounded-lg bg-muted/40 border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
									<div className="flex flex-wrap gap-4 text-muted-foreground">
										<span>
											Produtos:{" "}
											<strong className="text-foreground">
												{formatarMoeda(totalProdutos)}
											</strong>
										</span>
										{totalFrete > 0 && (
											<span>
												Frete:{" "}
												<strong className="text-foreground">
													{formatarMoeda(totalFrete)}
												</strong>
											</span>
										)}
										{totalDesconto > 0 && (
											<span className="text-red-600">
												Desconto:{" "}
												<strong>- {formatarMoeda(totalDesconto)}</strong>
											</span>
										)}
									</div>
									<span className="font-semibold text-base text-foreground whitespace-nowrap">
										Total NF-e: {formatarMoeda(totalNF)}
									</span>
								</div>
							)}
						</FieldSet>
					</FieldGroup>

					<Separator className="my-6" />

					{/* ── 6. TRANSPORTE ──────────────────────────────────────────────── */}
					<FieldGroup>
						<FieldSet>
							<FieldLegend>6. Transporte</FieldLegend>
							<Field className="max-w-xs">
								<FieldLabel>Modalidade do frete</FieldLabel>
								<Controller
									control={form.control}
									name="transporte.modFrete"
									render={({ field }) => (
										<Select
											value={
												field.value !== undefined ? String(field.value) : "9"
											}
											onValueChange={(v) => field.onChange(Number(v))}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="0">
													0 — Contratação pelo Emitente (CIF)
												</SelectItem>
												<SelectItem value="1">
													1 — Contratação pelo Destinatário (FOB)
												</SelectItem>
												<SelectItem value="2">
													2 — Contratação por Terceiros
												</SelectItem>
												<SelectItem value="3">
													3 — Próprio por conta do Emitente
												</SelectItem>
												<SelectItem value="4">
													4 — Próprio por conta do Destinatário
												</SelectItem>
												<SelectItem value="9">
													9 — Sem Ocorrência de Transporte
												</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</Field>
						</FieldSet>
					</FieldGroup>

					<Separator className="my-6" />

					{/* ── 6. PAGAMENTO ───────────────────────────────────────────────── */}
					<FieldGroup>
						<FieldSet>
							<FieldLegend>7. Pagamento</FieldLegend>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<Field>
									<FieldLabel>Forma de pagamento</FieldLabel>
									<Select
										value={formaPagamento}
										onValueChange={setFormaPagamento}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{FORMAS_PAGAMENTO.map((f) => (
												<SelectItem key={f.codigo} value={f.codigo}>
													{f.codigo} — {f.descricao}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>

								<Field>
									<FieldLabel>Valor</FieldLabel>
									<MoneyInput
										value={String(
											formaPagamento === "90" ? 0 : totalNF.toFixed(2),
										)}
										onChange={() => {}}
										disabled
										className="bg-muted"
									/>
								</Field>
							</div>
						</FieldSet>
					</FieldGroup>

					<Separator className="my-6" />

					{/* ── INTEGRAÇÃO ERP ─────────────────────────────────────────────── */}
					<FieldGroup>
						<FieldSet>
							<FieldLegend>8. Integração (estoque e financeiro)</FieldLegend>
							<CamposIntegracaoNfVenda
								idtipodocumento={idtipodocumentoWatch}
								idcondicaopagto={idcondicaopagtoWatch}
								idplanocontas={idplanocontasWatch}
								idlocalestoque={idlocalestoqueWatch}
								gerarFinanceiro={gerarFinanceiroWatch ?? true}
								gerarEstoque={gerarEstoqueWatch ?? true}
								desabilitado={isOperacaoDevolucao}
								onIdtipodocumentoChange={(value) =>
									form.setValue("idtipodocumento", value || undefined)
								}
								onIdcondicaopagtoChange={(value) =>
									form.setValue("idcondicaopagto", value || undefined)
								}
								onIdplanocontasChange={(value) =>
									form.setValue("idplanocontas", value || undefined)
								}
								onIdlocalestoqueChange={(value) =>
									form.setValue("idlocalestoque", value || undefined)
								}
								onGerarFinanceiroChange={(value) =>
									form.setValue("gerarFinanceiro", value)
								}
								onGerarEstoqueChange={(value) =>
									form.setValue("gerarEstoque", value)
								}
								onFormaPagamentoNfeSugerida={(codigo) => {
									if (!isOperacaoDevolucao) {
										setFormaPagamento(codigo);
									}
								}}
							/>
						</FieldSet>
					</FieldGroup>

					<Separator className="my-6" />

					{/* ── 7. DADOS ADICIONAIS ─────────────────────────────────────────── */}
					<FieldGroup>
						<FieldSet>
							<FieldLegend>9. Dados Adicionais</FieldLegend>
							<Field>
								<FieldLabel>Informações complementares</FieldLabel>
								<Textarea
									placeholder="Informações de interesse do Fisco e do contribuinte..."
									rows={3}
									maxLength={2000}
									{...form.register("informacoesAdicionais")}
								/>
							</Field>
						</FieldSet>
					</FieldGroup>
				</form>
			</div>

			{/* ── Barra de ação sticky (rodapé) ───────────────────────────────── */}
			<div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur border-t px-4 sm:px-6 py-3">
				<div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
					<div className="text-sm text-muted-foreground">
						{itensValue.length > 0 ? (
							<>
								<span className="text-foreground font-semibold text-base">
									{formatarMoeda(totalNF)}
								</span>
								{" "}
								<span className="hidden sm:inline">
									({itensValue.length}{" "}
									{itensValue.length === 1 ? "item" : "itens"})
								</span>
							</>
						) : (
							<span className="italic">Adicione itens à nota</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link href="/nota-fiscal-venda">Cancelar</Link>
						</Button>
						<Button
							type="submit"
							form="form-emissao-nfe"
							className="gap-2"
							disabled={isPending || itensValue.length === 0}
						>
							<Send className="h-4 w-4" />
							{isPending ? "Emitindo..." : "Emitir NF-e"}
						</Button>
					</div>
				</div>
			</div>

			<ModalItemEmissao
				open={modalItemAberto}
				onClose={() => {
					setModalItemAberto(false);
					setItemEditando(null);
				}}
				onConfirmar={adicionarItem}
				idempresa={empresa.id}
				crt={empresaFiscal?.crt ?? 3}
				cfopSaidaPadrao={cfopSaida}
				cfopOpcoes={opcoesCfopOperacao}
				cfopsReferencia={(cfopsOperacao ?? [])
					.filter((cfop): cfop is typeof cfop & { codigo: string } =>
						Boolean(cfop.codigo),
					)
					.map((cfop) => ({
						id: cfop.id,
						codigo: cfop.codigo,
					}))}
				ufEmpresa={empresaFiscal?.uf ?? null}
				devolucaoCompra={tipoDevolucaoAtivo === "compra"}
				itemParaEditar={
					itemEditando !== null ? itensValue[itemEditando.index] : null
				}
			/>

			<ModalConfirmacaoProducao
				open={modalConfirmacaoAberto}
				onClose={() => setModalConfirmacaoAberto(false)}
				onConfirmar={handleConfirmarProducao}
				carregando={isPending}
			/>

			<AlertDialog open={cfopDialogAberto} onOpenChange={setCfopDialogAberto}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Aplicar CFOP da natureza aos itens?</AlertDialogTitle>
						<AlertDialogDescription>
							Os itens possuem CFOP diferente do selecionado na natureza da
							operação ({cfopPendente}). Deseja atualizar o CFOP de todos os itens
							para coincidir com a natureza?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => confirmarPropagacaoCfop(false)}
						>
							Não, manter CFOP dos itens
						</AlertDialogCancel>
						<AlertDialogAction onClick={() => confirmarPropagacaoCfop(true)}>
							Sim, aplicar a todos
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
