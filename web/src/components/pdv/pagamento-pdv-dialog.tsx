"use client";

import {
	IconArrowLeft,
	IconCash,
	IconCreditCard,
	IconFileInvoice,
	IconQrcode,
	IconWallet,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Combobox } from "@/components/ui/combobox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	extrairPagamentosErpForm,
	isPagamentoMeioPdv,
	pagamentoPdvExigeCliente,
	calcularTotalComTaxas,
	calcularTroco,
	arredondarMoeda,
	fecharContaFormToPagamentosParciais,
	formatCurrency,
	MEIOS_PAGAMENTO_PDV,
	pagamentoCobreTotal,
	pagamentosToFecharContaForm,
	parseValor,
	totalPagamentosParciais,
	type ConfirmacaoVendaPdvResult,
	type CupomItemLinha,
	type CupomNaoFiscalData,
	type MeioPagamentoPdv,
	type PagamentoParcialPdv,
} from "@/lib/gourmet-utils";
import { ESCOPO_CONDICAO_PAGAMENTO } from "@/schemas/condicao-pagamento.schema";
import type { FecharContaFormData } from "@/schemas/fechar-conta.schema";
import { condicaoPagamentoService } from "@/services/condicao-pagamento.service";
import { entidadesService } from "@/services/entidades.service";
import {
	tipoDocumentoFinanceiroService,
	type TipoDocumentoFinanceiro,
} from "@/services/tipo-documento-financeiro.service";
import { AvisoAmbienteNfe } from "@/app/(auth)/nota-fiscal-venda/components/aviso-ambiente-nfe";
import { useNfceAmbientePdv } from "@/hooks/use-nfce-ambiente-pdv";
import { CupomNaoFiscal } from "./cupom-nao-fiscal";

const ICONES_MEIO: Record<MeioPagamentoPdv, typeof IconCash> = {
	dinheiro: IconCash,
	cartao_credito: IconCreditCard,
	cartao_debito: IconCreditCard,
	pix: IconQrcode,
	prepago: IconWallet,
};

type PassoPagamento = "selecao" | "valor" | "cupom";

interface PagamentoPdvDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	subtotal: number;
	itens: CupomItemLinha[];
	empresaNome: string;
	contexto?: string;
	titulo?: string;
	onConfirmarVenda: (
		pagamento: FecharContaFormData,
	) => Promise<ConfirmacaoVendaPdvResult | void>;
	onVendaConcluida?: () => void;
	isPending?: boolean;
	pagamentoInicial?: FecharContaFormData;
}

export function PagamentoPdvDialog({
	open,
	onOpenChange,
	subtotal,
	itens,
	empresaNome,
	contexto,
	titulo = "Pagamento",
	onConfirmarVenda,
	onVendaConcluida,
	isPending,
	pagamentoInicial,
}: PagamentoPdvDialogProps) {
	const [passo, setPasso] = useState<PassoPagamento>("selecao");
	const [pagamentos, setPagamentos] = useState<PagamentoParcialPdv[]>([]);
	const [meioSelecionado, setMeioSelecionado] = useState<MeioPagamentoPdv | null>(
		null,
	);
	const [formaErpSelecionada, setFormaErpSelecionada] =
		useState<TipoDocumentoFinanceiro | null>(null);
	const [identidade, setIdentidade] = useState("");
	const [idcondicaopagto, setIdcondicaopagto] = useState("");
	const [valorParcial, setValorParcial] = useState("");
	const [desconto, setDesconto] = useState("");
	const [taxaServico, setTaxaServico] = useState("");
	const [couvert, setCouvert] = useState("");
	const [ajustesAbertos, setAjustesAbertos] = useState(false);
	const [cupomDados, setCupomDados] = useState<CupomNaoFiscalData | null>(null);
	const [finalizando, setFinalizando] = useState(false);
	const { ambiente: ambienteNfce } = useNfceAmbientePdv();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data: formasErpAprazo = [] } = useQuery({
		queryKey: ["tipos-documento-financeiro-pdv-aprazo", empresa?.id],
		queryFn: async () => {
			if (!empresa) return [];
			const formas = await tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
			return formas.filter((f) => f.aprazo === 1 && f.inativo !== 1);
		},
		enabled: open && !!empresa?.id,
	});

	const { data: clientes = [] } = useQuery({
		queryKey: ["entidades-clientes-pdv", empresa?.id],
		queryFn: async () => {
			if (!empresa) return [];
			return entidadesService.listarTodos({
				idempresa: empresa.id,
				cliente: 1,
			});
		},
		enabled: open && !!empresa?.id,
	});

	const { data: condicoesPagamento = [] } = useQuery({
		queryKey: ["condicoes-pagamento-pdv", empresa?.id],
		queryFn: async () => {
			if (!empresa) return [];
			const condicoes = await condicaoPagamentoService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
			return condicoes.filter(
				(c) =>
					c.inativo !== 1 &&
					(c.escopo === null ||
						c.escopo === ESCOPO_CONDICAO_PAGAMENTO.COMPRA_E_VENDA ||
						c.escopo === ESCOPO_CONDICAO_PAGAMENTO.VENDAS),
			);
		},
		enabled: open && !!empresa?.id,
	});

	const opcoesClientes = useMemo(
		() =>
			clientes.map((c) => ({
				value: c.id,
				label:
					c.razaosocial?.trim() ||
					c.nome?.trim() ||
					c.cnpjcpf?.trim() ||
					"Cliente sem nome",
			})),
		[clientes],
	);

	const exigeCliente =
		pagamentoPdvExigeCliente(pagamentos) ||
		(formaErpSelecionada?.aprazo === 1 && passo === "valor");

	const descontoNum = parseValor(desconto);
	const taxaServicoNum = parseValor(taxaServico);
	const couvertNum = parseValor(couvert);
	const total = calcularTotalComTaxas(
		subtotal,
		descontoNum,
		taxaServicoNum,
		couvertNum,
	);
	const pago = totalPagamentosParciais(pagamentos);
	const restante = Math.max(0, arredondarMoeda(total - pago));

	useEffect(() => {
		if (!open) {
			setPasso("selecao");
			setPagamentos([]);
			setMeioSelecionado(null);
			setFormaErpSelecionada(null);
			setIdentidade("");
			setIdcondicaopagto("");
			setValorParcial("");
			setDesconto("");
			setTaxaServico("");
			setCouvert("");
			setAjustesAbertos(false);
			setCupomDados(null);
			setFinalizando(false);
			return;
		}

		if (pagamentoInicial) {
			setPasso("selecao");
			setPagamentos(fecharContaFormToPagamentosParciais(pagamentoInicial));
			setMeioSelecionado(null);
			setFormaErpSelecionada(null);
			setIdentidade("");
			setIdcondicaopagto("");
			setValorParcial("");
			setDesconto(pagamentoInicial.desconto ?? "");
			setTaxaServico(pagamentoInicial.valortaxaservico ?? "");
			setCouvert(pagamentoInicial.valorcouverartistico ?? "");
			setAjustesAbertos(false);
			setCupomDados(null);
			setFinalizando(false);
		}
	}, [open, pagamentoInicial]);

	const selecionarMeio = (meio: MeioPagamentoPdv) => {
		const info = MEIOS_PAGAMENTO_PDV.find((m) => m.id === meio);
		if (!info) return;

		setFormaErpSelecionada(null);
		setMeioSelecionado(meio);
		setValorParcial(restante > 0 ? arredondarMoeda(restante).toFixed(2) : "");
		setPasso("valor");
	};

	const selecionarFormaErp = (forma: TipoDocumentoFinanceiro) => {
		setMeioSelecionado(null);
		setFormaErpSelecionada(forma);
		setValorParcial(restante > 0 ? arredondarMoeda(restante).toFixed(2) : "");
		setPasso("valor");
	};

	const tentarAvancarPagamentos = (novosPagamentos: PagamentoParcialPdv[]) => {
		const novoPago = totalPagamentosParciais(novosPagamentos);

		if (pagamentoCobreTotal(novoPago, total)) {
			if (pagamentoPdvExigeCliente(novosPagamentos) && !identidade.trim()) {
				toast.error("Selecione o cliente para pagamento a prazo");
				return;
			}
			setPagamentos(novosPagamentos);
			void finalizarVenda(novosPagamentos);
			return;
		}

		setPagamentos(novosPagamentos);
		setMeioSelecionado(null);
		setFormaErpSelecionada(null);
		setValorParcial("");
		setPasso("selecao");
		toast.info(
			`Restam ${formatCurrency(arredondarMoeda(total - novoPago))} para pagar`,
		);
	};

	const confirmarValorParcial = () => {
		const valor = parseValor(valorParcial);
		if (valor <= 0) {
			toast.error("Informe um valor maior que zero");
			return;
		}

		if (formaErpSelecionada) {
			if (formaErpSelecionada.aprazo === 1 && !identidade.trim()) {
				toast.error("Selecione o cliente para pagamento a prazo");
				return;
			}

			const novosPagamentos: PagamentoParcialPdv[] = [
				...pagamentos,
				{
					tipo: "erp",
					idtipodocumentofinanceiro: formaErpSelecionada.id,
					valor,
					label: formaErpSelecionada.descricao,
					aprazo: formaErpSelecionada.aprazo === 1,
				},
			];
			tentarAvancarPagamentos(novosPagamentos);
			return;
		}

		const info = MEIOS_PAGAMENTO_PDV.find((m) => m.id === meioSelecionado);
		if (!info) return;

		const novosPagamentos: PagamentoParcialPdv[] = [
			...pagamentos,
			{
				tipo: "meio",
				meio: info.id,
				valor,
				label: info.label,
			},
		];
		tentarAvancarPagamentos(novosPagamentos);
	};

	const finalizarVenda = async (pagamentosFinais: PagamentoParcialPdv[]) => {
		if (pagamentoPdvExigeCliente(pagamentosFinais) && !identidade.trim()) {
			toast.error("Selecione o cliente para pagamento a prazo");
			return;
		}

		const pagamentosMeio = pagamentosFinais.filter(isPagamentoMeioPdv);
		const formData: FecharContaFormData = {
			...pagamentosToFecharContaForm(pagamentosMeio, {
				desconto: descontoNum,
				taxaServico: taxaServicoNum,
				couvert: couvertNum,
			}),
			...(identidade.trim() ? { identidade: identidade.trim() } : {}),
			...(idcondicaopagto.trim() ? { idcondicaopagto: idcondicaopagto.trim() } : {}),
			...(extrairPagamentosErpForm(pagamentosFinais).length > 0
				? { pagamentosErp: extrairPagamentosErpForm(pagamentosFinais) }
				: {}),
		};
		const troco = calcularTroco(total, formData);

		setFinalizando(true);
		try {
			const resultado = await onConfirmarVenda(formData);
			setCupomDados({
				vendaId: resultado?.vendaId,
				empresaNome,
				dataHora: new Date(),
				itens,
				subtotal,
				desconto: descontoNum,
				taxaServico: taxaServicoNum,
				couvert: couvertNum,
				total,
				pagamentos: pagamentosFinais,
				troco,
				contexto,
				nfce: resultado?.nfce
					? {
							...resultado.nfce,
							ambiente: resultado.nfce.ambiente ?? ambienteNfce ?? undefined,
						}
					: undefined,
			});
			setPasso("cupom");
		} catch {
			setPasso("selecao");
		} finally {
			setFinalizando(false);
		}
	};

	const handleFecharCupom = () => {
		onOpenChange(false);
		onVendaConcluida?.();
	};

	const processando = isPending || finalizando;
	const meioAtual = MEIOS_PAGAMENTO_PDV.find((m) => m.id === meioSelecionado);
	const labelPagamentoAtual =
		meioAtual?.label ?? formaErpSelecionada?.descricao ?? "Pagamento";

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (passo === "cupom" && !next) {
					handleFecharCupom();
					return;
				}
				onOpenChange(next);
			}}
		>
			<DialogContent
				className={
					passo === "cupom"
						? "flex max-h-[95vh] flex-col sm:max-w-lg"
						: "max-h-[90vh] overflow-y-auto sm:max-w-md"
				}
			>
				{passo === "cupom" && cupomDados ? (
					<CupomNaoFiscal dados={cupomDados} onFechar={handleFecharCupom} />
				) : passo === "valor" && (meioAtual || formaErpSelecionada) ? (
					<>
						<DialogHeader>
							<DialogTitle>Pagamento — {labelPagamentoAtual}</DialogTitle>
							<DialogDescription>
								Informe o valor recebido nesta forma de pagamento.
							</DialogDescription>
						</DialogHeader>

						<AvisoAmbienteNfe ambiente={ambienteNfce} className="text-xs" />

						{formaErpSelecionada?.aprazo === 1 && (
							<FieldGroup className="gap-3">
								<Field>
									<FieldLabel>Cliente *</FieldLabel>
									<Combobox
										options={opcoesClientes}
										value={identidade}
										onChange={setIdentidade}
										placeholder="Selecionar cliente..."
										searchPlaceholder="Buscar cliente..."
										emptyMessage="Nenhum cliente encontrado."
										disabled={processando}
									/>
								</Field>
								<Field>
									<FieldLabel>Condição de pagamento</FieldLabel>
									<Select
										value={idcondicaopagto || "none"}
										onValueChange={(v) =>
											setIdcondicaopagto(v === "none" ? "" : v)
										}
										disabled={processando}
									>
										<SelectTrigger>
											<SelectValue placeholder="À vista (1 parcela)" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">À vista (1 parcela)</SelectItem>
											{condicoesPagamento.map((condicao) => (
												<SelectItem key={condicao.id} value={condicao.id}>
													{condicao.codigo
														? `${condicao.codigo} - ${condicao.descricao}`
														: condicao.descricao}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							</FieldGroup>
						)}

						<div className="rounded-lg bg-muted/50 p-4 text-center">
							<p className="text-sm text-muted-foreground">Restante a pagar</p>
							<p className="text-2xl font-bold text-primary">
								{formatCurrency(restante)}
							</p>
							{pago > 0 && (
								<p className="mt-1 text-xs text-muted-foreground">
									Já pago: {formatCurrency(pago)} de {formatCurrency(total)}
								</p>
							)}
						</div>

						<FieldGroup>
							<Field>
								<FieldLabel>Valor — {labelPagamentoAtual}</FieldLabel>
								<MoneyInput
									value={valorParcial}
									onChange={setValorParcial}
									placeholder="R$ 0,00"
									autoFocus
								/>
							</Field>
						</FieldGroup>

						<div className="mt-4 flex gap-2">
							<Button
								type="button"
								variant="outline"
								className="flex-1"
								disabled={processando}
								onClick={() => {
									setMeioSelecionado(null);
									setFormaErpSelecionada(null);
									setValorParcial("");
									setPasso("selecao");
								}}
							>
								<IconArrowLeft className="size-4" />
								Voltar
							</Button>
							<Button
								type="button"
								className="flex-1"
								disabled={processando}
								onClick={confirmarValorParcial}
							>
								{processando ? "Processando..." : "Confirmar pagamento"}
							</Button>
						</div>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>{titulo}</DialogTitle>
							<DialogDescription>
								Selecione a forma de pagamento e informe o valor.
							</DialogDescription>
						</DialogHeader>

						<AvisoAmbienteNfe ambiente={ambienteNfce} className="text-xs" />

						<div className="rounded-lg bg-muted/50 p-4 text-center">
							<p className="text-sm text-muted-foreground">
								{pago > 0 ? "Restante a pagar" : "Total a pagar"}
							</p>
							<p className="text-3xl font-bold text-primary">
								{formatCurrency(pago > 0 ? restante : total)}
							</p>
							{pago > 0 && (
								<p className="mt-1 text-xs text-muted-foreground">
									Total: {formatCurrency(total)} · Pago: {formatCurrency(pago)}
								</p>
							)}
							{pago === 0 && (
								<p className="mt-1 text-xs text-muted-foreground">
									Subtotal: {formatCurrency(subtotal)}
								</p>
							)}
						</div>

						{pagamentos.length > 0 && (
							<div className="space-y-1 rounded-lg border p-3 text-sm">
								<p className="font-medium text-muted-foreground">
									Pagamentos registrados
								</p>
								{pagamentos.map((p, i) => (
									<div
										key={`${p.tipo}-${p.label}-${i}`}
										className="flex justify-between"
									>
										<span>{p.label}</span>
										<span>{formatCurrency(p.valor)}</span>
									</div>
								))}
							</div>
						)}

						{exigeCliente && passo === "selecao" && (
							<FieldGroup className="gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
								<Field>
									<FieldLabel>Cliente *</FieldLabel>
									<Combobox
										options={opcoesClientes}
										value={identidade}
										onChange={setIdentidade}
										placeholder="Selecionar cliente..."
										searchPlaceholder="Buscar cliente..."
										emptyMessage="Nenhum cliente encontrado."
										disabled={processando}
									/>
									<p className="text-xs text-muted-foreground">
										Obrigatório para gerar contas a receber do pagamento a prazo.
									</p>
								</Field>
								<Field>
									<FieldLabel>Condição de pagamento</FieldLabel>
									<Select
										value={idcondicaopagto || "none"}
										onValueChange={(v) =>
											setIdcondicaopagto(v === "none" ? "" : v)
										}
										disabled={processando}
									>
										<SelectTrigger>
											<SelectValue placeholder="À vista (1 parcela)" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">À vista (1 parcela)</SelectItem>
											{condicoesPagamento.map((condicao) => (
												<SelectItem key={condicao.id} value={condicao.id}>
													{condicao.codigo
														? `${condicao.codigo} - ${condicao.descricao}`
														: condicao.descricao}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							</FieldGroup>
						)}

						<Collapsible open={ajustesAbertos} onOpenChange={setAjustesAbertos}>
							<CollapsibleTrigger asChild>
								<Button type="button" variant="ghost" className="w-full">
									{ajustesAbertos ? "Ocultar ajustes" : "Desconto, taxa e couvert"}
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<FieldGroup className="mt-2 gap-3">
									<Field>
										<FieldLabel>Desconto</FieldLabel>
										<MoneyInput
											value={desconto}
											onChange={setDesconto}
											placeholder="R$ 0,00"
										/>
									</Field>
									<Field>
										<FieldLabel>Taxa de serviço</FieldLabel>
										<MoneyInput
											value={taxaServico}
											onChange={setTaxaServico}
											placeholder="R$ 0,00"
										/>
									</Field>
									<Field>
										<FieldLabel>Couvert artístico</FieldLabel>
										<MoneyInput
											value={couvert}
											onChange={setCouvert}
											placeholder="R$ 0,00"
										/>
									</Field>
								</FieldGroup>
							</CollapsibleContent>
						</Collapsible>

						<div className="grid grid-cols-2 gap-3">
							{MEIOS_PAGAMENTO_PDV.map((meio) => {
								const Icon = ICONES_MEIO[meio.id];
								return (
									<button
										key={meio.id}
										type="button"
										disabled={processando || restante <= 0}
										onClick={() => selecionarMeio(meio.id)}
										className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4 transition-colors hover:border-primary hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Icon className="size-8 text-primary" />
										<span className="font-medium">{meio.label}</span>
									</button>
								);
							})}
						</div>

						{formasErpAprazo.length > 0 && (
							<div className="space-y-2">
								<p className="text-sm font-medium text-muted-foreground">
									A prazo (ERP)
								</p>
								<div className="grid grid-cols-2 gap-3">
									{formasErpAprazo.map((forma) => (
										<button
											key={forma.id}
											type="button"
											disabled={processando || restante <= 0}
											onClick={() => selecionarFormaErp(forma)}
											className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4 transition-colors hover:border-primary hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<IconFileInvoice className="size-8 text-primary" />
											<span className="text-center text-sm font-medium">
												{forma.descricao}
											</span>
										</button>
									))}
								</div>
							</div>
						)}

						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={() => onOpenChange(false)}
							disabled={processando}
						>
							Cancelar
						</Button>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
