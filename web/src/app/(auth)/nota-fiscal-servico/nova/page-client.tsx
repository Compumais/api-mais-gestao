"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import { emissaoNfseSchema } from "@/schemas/nfse-emissao.schema";
import { nfseConfiguracaoService } from "@/services/nfse-configuracao.service";
import {
	buscarNfsePorId,
	emitirNfse,
	type NotaFiscalServicoDetalhe,
} from "@/services/nfse-emissao.service";
import { PageContainer } from "../../components/page-container";
import { CampoItemLc116Nfse } from "../components/campo-item-lc116-nfse";
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
			servico?.itemListaServico ||
			item?.codigolistalc11603 ||
			"",
		discriminacao:
			servico?.discriminacao || item?.descricao || "",
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
				(notaFiscal.valortotalnota
					? Number(notaFiscal.valortotalnota)
					: 0),
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

export default function NovaNfsePage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const origemId = searchParams.get("origem")?.trim() || null;
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [erroEmissao, setErroEmissao] = useState<{
		titulo: string;
		motivo: string;
		codigo?: string | null;
	} | null>(null);
	const [origemAplicada, setOrigemAplicada] = useState<string | null>(null);

	const { data: config } = useQuery({
		queryKey: ["nfse-configuracao", empresa?.id],
		queryFn: () => nfseConfiguracaoService.buscar(empresa!.id),
		enabled: !!empresa?.id,
	});

	const { data: origemDetalhe, isLoading: carregandoOrigem } = useQuery({
		queryKey: ["nfse-origem", origemId],
		queryFn: () => buscarNfsePorId(origemId!),
		enabled: !!origemId,
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
			codigoIndicadorOperacao: "",
			exigibilidadeIss: "1",
			issRetido: "2",
			valores: { servicos: 0, iss: 0, aliquota: 0 },
			gerarFinanceiro: true,
			confirmarProducao: false,
		},
	});

	useEffect(() => {
		if (!origemDetalhe || !origemId || origemAplicada === origemId) return;
		form.reset({
			itemListaServico: "",
			discriminacao: "",
			codigoTributacaoNacional: "",
			codigoNbs: "",
			codigoIndicadorOperacao: "",
			exigibilidadeIss: "1",
			issRetido: "2",
			valores: { servicos: 0, iss: 0, aliquota: 0 },
			gerarFinanceiro: true,
			confirmarProducao: false,
			...mapearOrigemParaFormulario(origemDetalhe),
		});
		setOrigemAplicada(origemId);
	}, [origemDetalhe, origemId, origemAplicada, form]);

	const emitirMutation = useMutation({
		mutationFn: (dados: z.output<typeof emissaoNfseSchema>) =>
			emitirNfse(empresa!.id, dados),
		onSuccess: (resultado) => {
			if (resultado.numeroNfse) {
				toast.success(`NFS-e ${resultado.numeroNfse} autorizada`);
			} else if (resultado.protocolo) {
				toast.warning(
					`DPS recebida. Protocolo: ${resultado.protocolo}. Consulte o status no detalhe.`,
				);
			} else {
				toast.warning("Transmitido — consulte o status na listagem");
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
		return (
			versao.includes("dps") ||
			versao.includes("nacional") ||
			url.includes("/dps/")
		);
	})();
	const { errors } = form.formState;

	return (
		<PageContainer>
			<main className="flex flex-col gap-6 py-4 px-4 max-w-3xl">
				<header>
					<h1 className="text-2xl font-bold">
						{origemId ? "Emitir a partir de NFS-e existente" : "Nova NFS-e"}
					</h1>
					<p className="text-muted-foreground text-sm">
						{origemId
							? "Formulário pré-preenchido — a emissão gera um novo RPS/NFS-e"
							: "Emissão manual de serviço (RPS → NFS-e)"}
					</p>
				</header>

				{origemId && carregandoOrigem ? (
					<p className="text-muted-foreground text-sm">
						Carregando dados da nota de origem...
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
					className="space-y-6"
					onSubmit={form.handleSubmit((dados) => {
						setErroEmissao(null);
						emitirMutation.mutate(dados);
					})}
				>
					<FieldGroup>
						<FieldSet>
							<FieldLegend>1. Tomador do serviço</FieldLegend>
							<Field data-invalid={!!errors.iddestinatario}>
								<FieldLabel htmlFor="iddestinatario">Cliente</FieldLabel>
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
						</FieldSet>

						<FieldSet>
							<FieldLegend>2. Serviço prestado</FieldLegend>
							<Field data-invalid={!!errors.itemListaServico}>
								<FieldLabel htmlFor="itemListaServico">Item LC 116</FieldLabel>
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
											error={errors.itemListaServico}
										/>
									)}
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor="discriminacao">Discriminação</FieldLabel>
								<Textarea
									id="discriminacao"
									rows={4}
									{...form.register("discriminacao")}
								/>
							</Field>

							{layoutDps ? (
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<Field data-invalid={!!errors.codigoTributacaoNacional}>
										<FieldLabel htmlFor="codigoTributacaoNacional">
											cTribNac (6 dígitos)
										</FieldLabel>
										<Input
											id="codigoTributacaoNacional"
											inputMode="numeric"
											maxLength={6}
											placeholder="Ex.: 010101"
											{...form.register("codigoTributacaoNacional")}
										/>
									</Field>
									<Field data-invalid={!!errors.codigoNbs}>
										<FieldLabel htmlFor="codigoNbs">
											cNBS (9 dígitos)
										</FieldLabel>
										<Input
											id="codigoNbs"
											inputMode="numeric"
											maxLength={9}
											placeholder="Ex.: 115021000"
											{...form.register("codigoNbs")}
										/>
									</Field>
									<Field data-invalid={!!errors.codigoIndicadorOperacao}>
										<FieldLabel htmlFor="codigoIndicadorOperacao">
											cIndOp IBS/CBS (opcional)
										</FieldLabel>
										<Input
											id="codigoIndicadorOperacao"
											inputMode="numeric"
											maxLength={6}
											placeholder="Ex.: 100301 — deixe vazio se Simples"
											{...form.register("codigoIndicadorOperacao")}
										/>
										<p className="text-muted-foreground text-xs mt-1">
											Simples Nacional: deixe em branco (evita rejeição E082).
											Não confundir com cTribNac. TI remoto: 100301.
										</p>
									</Field>
								</div>
							) : null}

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<Field>
									<FieldLabel htmlFor="valorServicos">
										Valor serviços
									</FieldLabel>
									<Input
										id="valorServicos"
										type="number"
										step="0.01"
										min="0"
										{...form.register("valores.servicos", {
											valueAsNumber: true,
										})}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="aliquotaIss">
										Alíquota ISS (%)
									</FieldLabel>
									<Input
										id="aliquotaIss"
										type="number"
										step="0.01"
										min="0"
										{...form.register("valores.aliquota", {
											valueAsNumber: true,
										})}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="valorIss">Valor ISS</FieldLabel>
									<Input
										id="valorIss"
										type="number"
										step="0.01"
										min="0"
										{...form.register("valores.iss", { valueAsNumber: true })}
									/>
								</Field>
							</div>
						</FieldSet>

						{producao ? (
							<div className="flex items-center gap-2">
								<Checkbox
									id="confirmarProducao"
									checked={form.watch("confirmarProducao")}
									onCheckedChange={(v) =>
										form.setValue("confirmarProducao", v === true)
									}
								/>
								<FieldLabel htmlFor="confirmarProducao">
									Confirmo emissão em produção
								</FieldLabel>
							</div>
						) : null}

						<div className="flex gap-2">
							<Button type="submit" disabled={emitirMutation.isPending}>
								{emitirMutation.isPending ? "Emitindo..." : "Emitir NFS-e"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
							>
								Cancelar
							</Button>
						</div>
					</FieldGroup>
				</form>
			</main>
		</PageContainer>
	);
}
