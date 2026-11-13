"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	Calculator,
	ChevronDown,
	FileText,
	Info,
	Sparkles,
	User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AlertaVencimentoCertificado } from "@/components/alerta-vencimento-certificado";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NFE_STATUS } from "@/constants/nfe-status";
import { useEmpresa } from "@/hooks/use-empresa";
import { emissaoNfseSchema } from "@/schemas/nfse-emissao.schema";
import { empresaFiscalService } from "@/services/empresa-fiscal.service";
import { nfseConfiguracaoService } from "@/services/nfse-configuracao.service";
import {
	buscarNfsePorId,
	emitirNfse,
	type NotaFiscalServicoDetalhe,
} from "@/services/nfse-emissao.service";
import {
	ordemServicoService,
	type PrepararNfseOsResposta,
} from "@/services/ordem-servico.service";
import { PageContainer } from "../../components/page-container";
import { CampoIndicadorOperacaoNfse } from "../components/campo-indicador-operacao-nfse";
import { CampoItemLc116Nfse } from "../components/campo-item-lc116-nfse";
import { CampoNbsNfse } from "../components/campo-nbs-nfse";
import { CampoTomadorNfse } from "../components/campo-tomador-nfse";
import { CardErroNfse } from "../components/card-erro-nfse";

function mapearOrigemParaFormulario(
	detalhe: NotaFiscalServicoDetalhe,
): Partial<z.input<typeof emissaoNfseSchema>> {
	const { notaFiscal, itens } = detalhe;
	const payload = notaFiscal.dadosimportacao?.payload;
	const servico = payload?.servico;
	const item = itens[0];
	const valores = servico?.valores;

	return {
		iddestinatario: notaFiscal.identidade ?? undefined,
		itemListaServico:
			servico?.itemListaServico || item?.codigolistalc11603 || "",
		discriminacao: servico?.discriminacao || item?.descricao || "",
		codigoCnae: servico?.codigoCnae || "",
		codigoTributacaoMunicipio: servico?.codigoTributacaoMunicipio || "",
		codigoTributacaoNacional: servico?.codigoTributacaoNacional || "",
		codigoNbs: servico?.codigoNbs || "",
		codigoIndicadorOperacao: servico?.ibsCbs?.cIndOp || "",
		exigibilidadeIss: servico?.exigibilidadeIss || "1",
		issRetido: servico?.issRetido || "2",
		valores: {
			servicos:
				valores?.servicos ??
				(item?.total != null && item.total !== ""
					? Number(item.total)
					: undefined) ??
				(notaFiscal.valortotalnota ? Number(notaFiscal.valortotalnota) : 0),
			iss: valores?.iss ?? 0,
			aliquota: valores?.aliquota ?? 0,
			pis: valores?.pis,
			cofins: valores?.cofins,
			inss: valores?.inss,
			ir: valores?.ir,
			csll: valores?.csll,
		},
		gerarFinanceiro: notaFiscal.dadosimportacao?.gerarFinanceiro ?? true,
		confirmarProducao: false,
	};
}

function mapearOsParaFormulario(
	rascunho: PrepararNfseOsResposta,
): Partial<z.input<typeof emissaoNfseSchema>> {
	return {
		iddestinatario: rascunho.iddestinatario,
		itemListaServico: rascunho.itemListaServico,
		discriminacao: rascunho.discriminacao,
		codigoTributacaoMunicipio: rascunho.codigoTributacaoMunicipio ?? "",
		codigoTributacaoNacional: rascunho.codigoTributacaoNacional ?? "",
		codigoNbs: rascunho.codigoNbs ?? "",
		exigibilidadeIss: rascunho.exigibilidadeIss,
		issRetido: rascunho.issRetido,
		valores: rascunho.valores,
		idplanocontas: rascunho.idplanocontas,
		idcondicaopagto: rascunho.idcondicaopagto,
		idtipodocumento: rascunho.idtipodocumento,
		idordemservico: rascunho.idordemservico,
		itens: rascunho.itens,
		gerarFinanceiro: false,
		confirmarProducao: false,
	};
}

export default function NovaNfsePage() {
	const formId = useId();
	const fid = (nome: string) => `${formId}-${nome}`;
	const router = useRouter();
	const searchParams = useSearchParams();
	const origemId = searchParams.get("origem")?.trim() || null;
	const ordemServicoId = searchParams.get("ordemServico")?.trim() || null;
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [erroEmissao, setErroEmissao] = useState<{
		titulo: string;
		motivo: string;
		codigo?: string | null;
	} | null>(null);
	const [origemAplicada, setOrigemAplicada] = useState<string | null>(null);
	const [osAplicada, setOsAplicada] = useState<string | null>(null);
	const [avancadoAberto, setAvancadoAberto] = useState(false);

	const { data: config } = useQuery({
		queryKey: ["nfse-configuracao", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return nfseConfiguracaoService.buscar(empresa.id);
		},
		enabled: !!empresa?.id,
	});

	const { data: empresaFiscal } = useQuery({
		queryKey: ["empresa-fiscal-nfse", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return empresaFiscalService.buscar(empresa.id);
		},
		enabled: !!empresa?.id,
	});

	const { data: origemDetalhe, isLoading: carregandoOrigem } = useQuery({
		queryKey: ["nfse-origem", origemId],
		queryFn: () => {
			if (!origemId) throw new Error("NFS-e de origem não informada");
			return buscarNfsePorId(origemId);
		},
		enabled: !!origemId,
	});

	const { data: rascunhoOs, isLoading: carregandoOs } = useQuery({
		queryKey: ["nfse-rascunho-os", ordemServicoId, empresa?.id],
		queryFn: () => {
			if (!ordemServicoId || !empresa) {
				throw new Error("Ordem de serviço ou empresa não informada");
			}
			return ordemServicoService.prepararNfse(ordemServicoId, {
				idempresa: empresa.id,
			});
		},
		enabled: !!ordemServicoId && !!empresa?.id,
	});

	const form = useForm<
		z.input<typeof emissaoNfseSchema>,
		unknown,
		z.output<typeof emissaoNfseSchema>
	>({
		resolver: zodResolver(emissaoNfseSchema),
		defaultValues: {
			itemListaServico: "",
			discriminacao: "",
			codigoTributacaoNacional: "",
			codigoNbs: "",
			codigoIndicadorOperacao: "100301",
			exigibilidadeIss: "1",
			issRetido: "2",
			valores: { servicos: 0, iss: 0, aliquota: 0 },
			gerarFinanceiro: true,
			confirmarProducao: false,
		},
	});

	const { errors } = form.formState;

	const valorServicos = form.watch("valores.servicos") || 0;
	const aliquotaIss = form.watch("valores.aliquota") || 0;
	const issRetidoValor = form.watch("issRetido");
	const isRetido = issRetidoValor === "1";

	// Recálculo automático do ISS em tempo real
	useEffect(() => {
		const valorIssCalculado = Number(
			((Number(valorServicos) * Number(aliquotaIss)) / 100).toFixed(2),
		);
		form.setValue("valores.iss", valorIssCalculado, { shouldValidate: false });
	}, [valorServicos, aliquotaIss, form]);

	useEffect(() => {
		if (!origemDetalhe || !origemId || origemAplicada === origemId) return;
		form.reset({
			itemListaServico: "",
			discriminacao: "",
			codigoTributacaoNacional: "",
			codigoNbs: "",
			codigoIndicadorOperacao: "100301",
			exigibilidadeIss: "1",
			issRetido: "2",
			valores: { servicos: 0, iss: 0, aliquota: 0 },
			gerarFinanceiro: true,
			confirmarProducao: false,
			...mapearOrigemParaFormulario(origemDetalhe),
		});
		setOrigemAplicada(origemId);
	}, [origemDetalhe, origemId, origemAplicada, form]);

	useEffect(() => {
		if (!rascunhoOs || !ordemServicoId || osAplicada === ordemServicoId) {
			return;
		}
		form.reset({
			itemListaServico: "",
			discriminacao: "",
			codigoTributacaoNacional: "",
			codigoNbs: "",
			codigoIndicadorOperacao: "100301",
			exigibilidadeIss: "1",
			issRetido: "2",
			valores: { servicos: 0, iss: 0, aliquota: 0 },
			gerarFinanceiro: false,
			confirmarProducao: false,
			...mapearOsParaFormulario(rascunhoOs),
		});
		setOsAplicada(ordemServicoId);
		if (rascunhoOs.avisos.length > 0) {
			toast.warning("Rascunho preparado com avisos", {
				description: rascunhoOs.avisos.join("; "),
			});
		}
	}, [rascunhoOs, ordemServicoId, osAplicada, form]);

	const emitirMutation = useMutation({
		mutationFn: (dados: z.output<typeof emissaoNfseSchema>) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return emitirNfse(empresa.id, dados);
		},
		onSuccess: (resultado) => {
			const chaveValida =
				(resultado.chaveAcesso ?? resultado.codigoVerificacao ?? "").replace(
					/\D/g,
					"",
				).length === 50;
			const foiAutorizada =
				resultado.status === NFE_STATUS.AUTORIZADA ||
				Boolean(resultado.numeroNfse) ||
				(chaveValida && !resultado.pendente && !resultado.erros?.length);
			const ficouPendente =
				resultado.pendente === true ||
				resultado.status === NFE_STATUS.PENDENTE ||
				(!foiAutorizada && Boolean(resultado.protocolo));
			const motivoErro =
				resultado.mensagemErro ||
				resultado.erros
					?.map((e) => (e.codigo ? `[${e.codigo}] ${e.mensagem}` : e.mensagem))
					.filter(Boolean)
					.join("; ");

			if (foiAutorizada) {
				toast.success(
					resultado.numeroNfse
						? `NFS-e ${resultado.numeroNfse} autorizada`
						: "NFS-e autorizada no ambiente nacional",
				);
			} else if (ficouPendente) {
				toast.warning(
					motivoErro ||
						(resultado.protocolo
							? `DPS recebida. Protocolo: ${resultado.protocolo}. Consulte o status no detalhe.`
							: "Emissão pendente de confirmação — consulte o status no detalhe."),
				);
			} else {
				toast.error("NFS-e rejeitada", {
					description: motivoErro || "Emissão NFS-e rejeitada pelo provedor",
				});
			}
			router.push(`/nota-fiscal-servico/${resultado.idnotafiscal}`);
		},
		onError: (error: Error) => {
			const motivo = error.message || "Erro ao emitir NFS-e";
			setErroEmissao({
				titulo: "Erro ao emitir NFS-e",
				motivo,
			});
			toast.error(motivo);
		},
	});

	if (!empresa) {
		return (
			<PageContainer>
				<p className="text-muted-foreground px-4">Selecione uma empresa</p>
			</PageContainer>
		);
	}

	const producao = config?.ambiente === 1;
	const layoutDps = (() => {
		const versao = (config?.versaolayout ?? "").toLowerCase();
		const url = (config?.urlwsdl ?? "").toLowerCase();
		const provedor = (config?.provedor ?? "").toLowerCase();
		return (
			versao.includes("dps") ||
			versao.includes("nacional") ||
			url.includes("/dps/") ||
			provedor === "sefin_nacional" ||
			provedor === "sefin-nacional" ||
			provedor === "adn"
		);
	})();

	const isSimplesOuMei =
		empresaFiscal?.crt === 1 ||
		empresaFiscal?.crt === 2 ||
		empresaFiscal?.crt === 4;

	const valorIssCalculado = form.watch("valores.iss") || 0;
	const valorLiquido = isRetido
		? Math.max(0, Number(valorServicos) - Number(valorIssCalculado))
		: Number(valorServicos);

	return (
		<PageContainer>
			<div className="py-4 px-4 max-w-6xl mx-auto space-y-6">
				<header>
					<h1 className="text-2xl font-bold tracking-tight">
						{ordemServicoId
							? "Revisar NFS-e da Ordem de Serviço"
							: origemId
								? "Emitir a partir de NFS-e existente"
								: "Nova NFS-e"}
					</h1>
					<p className="text-muted-foreground text-sm">
						{ordemServicoId
							? "Revise os serviços, impostos e tomador antes de transmitir"
							: origemId
								? "Formulário pré-preenchido — a emissão gera um novo RPS/NFS-e"
								: "Emissão de Nota Fiscal de Serviço (Portal Nacional / Sefin)"}
					</p>
				</header>

				<AlertaVencimentoCertificado />

				{origemId && carregandoOrigem ? (
					<p className="text-muted-foreground text-sm">
						Carregando dados da nota de origem...
					</p>
				) : null}
				{ordemServicoId && carregandoOs ? (
					<p className="text-muted-foreground text-sm">
						Preparando serviços da ordem de serviço...
					</p>
				) : null}

				{erroEmissao ? (
					<CardErroNfse
						titulo={erroEmissao.titulo}
						motivo={erroEmissao.motivo}
						codigo={erroEmissao.codigo}
					/>
				) : null}

				<form
					id={fid("form-nfse")}
					onSubmit={form.handleSubmit((dados) => {
						setErroEmissao(null);
						if (layoutDps) {
							const cIndOp = (dados.codigoIndicadorOperacao ?? "").replace(
								/\D/g,
								"",
							);
							if (!/^\d{6}$/.test(cIndOp)) {
								form.setError("codigoIndicadorOperacao", {
									message:
										"cIndOp obrigatório no portal nacional (6 dígitos, Anexo VII)",
								});
								toast.error(
									"Informe o indicador de operação IBS/CBS (6 dígitos)",
								);
								return;
							}
						}
						emitirMutation.mutate(dados);
					})}
				>
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
						{/* Coluna Principal: Formulário */}
						<div className="lg:col-span-8 space-y-6">
							{/* 1. Tomador */}
							<div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
								<div className="flex items-center gap-2 border-b pb-3">
									<User className="h-5 w-5 text-primary" />
									<h2 className="font-semibold text-base">
										1. Tomador do Serviço (Cliente)
									</h2>
								</div>
								<Field data-invalid={!!errors.iddestinatario}>
									<FieldLabel>Cliente</FieldLabel>
									<Controller
										control={form.control}
										name="iddestinatario"
										render={({ field }) => (
											<CampoTomadorNfse
												idempresa={empresa.id}
												value={field.value}
												onChange={field.onChange}
												error={errors.iddestinatario}
											/>
										)}
									/>
								</Field>
							</div>

							{/* 2. Serviço */}
							<div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
								<div className="flex items-center gap-2 border-b pb-3">
									<FileText className="h-5 w-5 text-primary" />
									<h2 className="font-semibold text-base">
										2. Serviço Prestado
									</h2>
								</div>

								<Field data-invalid={!!errors.itemListaServico}>
									<FieldLabel>Item da Lista de Serviços (LC 116/03)</FieldLabel>
									<Controller
										control={form.control}
										name="itemListaServico"
										render={({ field }) => (
											<CampoItemLc116Nfse
												value={field.value}
												onChange={field.onChange}
												onDescricaoSugerida={(descricao) => {
													if (!form.getValues("discriminacao")) {
														form.setValue("discriminacao", descricao);
													}
												}}
												onSugestaoFiscal={(sugestao) => {
													if (!form.getValues("codigoTributacaoNacional")) {
														form.setValue(
															"codigoTributacaoNacional",
															sugestao.cTribNac,
														);
													}
													if (
														sugestao.cNbsPadrao &&
														!form.getValues("codigoNbs")
													) {
														form.setValue(
															"codigoNbs",
															sugestao.cNbsPadrao,
														);
													}
													if (
														sugestao.cIndOpPadrao &&
														!form.getValues("codigoIndicadorOperacao")
													) {
														form.setValue(
															"codigoIndicadorOperacao",
															sugestao.cIndOpPadrao,
														);
													}
												}}
												error={errors.itemListaServico}
											/>
										)}
									/>
								</Field>

								<Field data-invalid={!!errors.discriminacao}>
									<FieldLabel htmlFor={fid("discriminacao")}>
										Discriminação detalhada do serviço
									</FieldLabel>
									<Textarea
										id={fid("discriminacao")}
										rows={4}
										placeholder="Descreva detalhadamente o serviço executado..."
										{...form.register("discriminacao")}
									/>
									<FieldError
										errors={
											errors.discriminacao
												? [{ message: errors.discriminacao.message }]
												: []
										}
									/>
								</Field>
							</div>

							{/* 3. Valores e Tributação */}
							<div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
								<div className="flex items-center justify-between border-b pb-3">
									<div className="flex items-center gap-2">
										<Calculator className="h-5 w-5 text-primary" />
										<h2 className="font-semibold text-base">
											3. Valores e ISS
										</h2>
									</div>
									{isSimplesOuMei ? (
										<span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
											<Sparkles className="h-3 w-3" /> Simples Nacional / MEI
										</span>
									) : null}
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<Field data-invalid={!!errors.valores?.servicos}>
										<FieldLabel htmlFor={fid("valorServicos")}>
											Valor dos serviços (R$)
										</FieldLabel>
										<Input
											id={fid("valorServicos")}
											type="number"
											step="0.01"
											min="0"
											placeholder="0,00"
											{...form.register("valores.servicos", {
												valueAsNumber: true,
											})}
										/>
									</Field>

									<Field data-invalid={!!errors.valores?.aliquota}>
										<FieldLabel htmlFor={fid("aliquotaIss")}>
											Alíquota ISS (%)
										</FieldLabel>
										<Input
											id={fid("aliquotaIss")}
											type="number"
											step="0.01"
											min="0"
											placeholder="0.00"
											{...form.register("valores.aliquota", {
												valueAsNumber: true,
											})}
										/>
									</Field>

									<Field>
										<FieldLabel htmlFor={fid("valorIss")}>
											Valor ISS (R$)
										</FieldLabel>
										<Input
											id={fid("valorIss")}
											type="number"
											step="0.01"
											min="0"
											className="bg-muted/50"
											{...form.register("valores.iss", {
												valueAsNumber: true,
											})}
										/>
									</Field>
								</div>

								{/* Retenção de ISS */}
								<div className="flex items-center justify-between pt-2 border-t">
									<div className="flex items-center gap-2">
										<Checkbox
											id={fid("issRetidoCheckbox")}
											checked={isRetido}
											onCheckedChange={(checked) =>
												form.setValue("issRetido", checked ? "1" : "2")
											}
										/>
										<FieldLabel
											htmlFor={fid("issRetidoCheckbox")}
											className="cursor-pointer"
										>
											ISS retido na fonte pelo tomador
										</FieldLabel>
									</div>
									{isSimplesOuMei && !isRetido ? (
										<p className="text-xs text-muted-foreground flex items-center gap-1">
											<Info className="h-3.5 w-3.5" /> ISS recolhido na guia do
											DAS
										</p>
									) : null}
								</div>
							</div>

							{/* 4. Configurações Fiscais Avançadas (Portal Nacional) */}
							{layoutDps ? (
								<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
									<button
										type="button"
										onClick={() => setAvancadoAberto((prev) => !prev)}
										className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
									>
										<div className="space-y-0.5">
											<p className="font-semibold text-sm">
												Configurações Fiscais do Portal Nacional (DPS)
											</p>
											<p className="text-xs text-muted-foreground">
												cTribNac, cNBS e Indicador de Operação IBS/CBS
											</p>
										</div>
										<ChevronDown
											className={`h-4 w-4 text-muted-foreground transition-transform ${
												avancadoAberto ? "rotate-180" : ""
											}`}
										/>
									</button>

									{avancadoAberto ? (
										<div className="p-5 border-t space-y-4">
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<Field data-invalid={!!errors.codigoTributacaoNacional}>
													<FieldLabel htmlFor={fid("codigoTributacaoNacional")}>
														cTribNac (6 dígitos)
													</FieldLabel>
													<Input
														id={fid("codigoTributacaoNacional")}
														inputMode="numeric"
														maxLength={6}
														placeholder="Ex.: 010701"
														{...form.register("codigoTributacaoNacional")}
													/>
													<p className="text-[11px] text-muted-foreground mt-1">
														Código de Tributação Nacional correspondente à LC
														116.
													</p>
												</Field>

												<Field data-invalid={!!errors.codigoNbs}>
													<FieldLabel>
														Código NBS (9 dígitos)
													</FieldLabel>
													<Controller
														control={form.control}
														name="codigoNbs"
														render={({ field }) => (
															<CampoNbsNfse
																value={field.value}
																onChange={field.onChange}
																error={errors.codigoNbs}
															/>
														)}
													/>
												</Field>
											</div>

											<Field data-invalid={!!errors.codigoIndicadorOperacao}>
												<FieldLabel>
													Indicador da Operação IBS/CBS (cIndOp)
												</FieldLabel>
												<Controller
													control={form.control}
													name="codigoIndicadorOperacao"
													render={({ field }) => (
														<CampoIndicadorOperacaoNfse
															value={field.value}
															onChange={field.onChange}
															error={errors.codigoIndicadorOperacao}
														/>
													)}
												/>
											</Field>
										</div>
									) : null}
								</div>
							) : null}
						</div>

						{/* Coluna Lateral: Resumo Sticky e Ações */}
						<div className="lg:col-span-4 sticky top-6 space-y-4">
							<div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
								<div className="flex items-center justify-between border-b pb-3">
									<h3 className="font-semibold text-base">Resumo da Nota</h3>
									<span
										className={`text-xs font-medium px-2 py-0.5 rounded-full ${
											producao
												? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
												: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
										}`}
									>
										{producao ? "🟢 Produção" : "🟡 Homologação"}
									</span>
								</div>

								<div className="space-y-3 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Subtotal Serviços:</span>
										<span className="font-medium">
											R$ {Number(valorServicos).toFixed(2)}
										</span>
									</div>

									<div className="flex justify-between">
										<span className="text-muted-foreground">
											ISS ({String(aliquotaIss)}%):
										</span>
										<span className="font-medium">
											R$ {Number(valorIssCalculado).toFixed(2)}
										</span>
									</div>

									{isRetido ? (
										<div className="flex justify-between text-amber-600 dark:text-amber-400">
											<span>(-) ISS Retido na fonte:</span>
											<span>- R$ {Number(valorIssCalculado).toFixed(2)}</span>
										</div>
									) : null}

									<div className="border-t pt-3 flex justify-between items-baseline">
										<span className="font-semibold text-base">
											Valor Líquido:
										</span>
										<span className="font-bold text-xl text-primary">
											R$ {Number(valorLiquido).toFixed(2)}
										</span>
									</div>
								</div>

								{producao ? (
									<div className="rounded-lg border border-amber-200 bg-amber-500/10 p-3 space-y-2">
										<div className="flex items-start gap-2">
											<AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
											<p className="text-xs text-amber-900 dark:text-amber-200">
												Atenção: A nota será emitida em ambiente oficial com
												validade jurídica.
											</p>
										</div>
										<div className="flex items-center gap-2 pt-1">
											<Checkbox
												id={fid("confirmarProducaoSide")}
												checked={form.watch("confirmarProducao")}
												onCheckedChange={(v) =>
													form.setValue("confirmarProducao", v === true)
												}
											/>
											<label
												htmlFor={fid("confirmarProducaoSide")}
												className="text-xs font-medium cursor-pointer"
											>
												Confirmo emissão em produção
											</label>
										</div>
									</div>
								) : null}

								<div className="space-y-2 pt-2">
									<Button
										type="submit"
										form={fid("form-nfse")}
										className="w-full font-semibold h-11"
										disabled={
											emitirMutation.isPending ||
											(producao && !form.watch("confirmarProducao"))
										}
									>
										{emitirMutation.isPending ? "Transmitindo NFS-e..." : "Emitir NFS-e"}
									</Button>
									<Button
										type="button"
										variant="outline"
										className="w-full"
										onClick={() => router.back()}
									>
										Cancelar
									</Button>
								</div>
							</div>
						</div>
					</div>
				</form>
			</div>
		</PageContainer>
	);
}
