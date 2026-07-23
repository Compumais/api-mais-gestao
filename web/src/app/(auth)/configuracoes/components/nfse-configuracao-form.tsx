"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	BETHA_DPS_WSDL,
	isLayoutNfseDps,
	NFSE_LAYOUTS,
	NFSE_PROVEDORES,
} from "@/constants/nfse-emissao";
import { nfseConfiguracaoSchema } from "@/schemas/nfse-configuracao.schema";
import { nfseConfiguracaoService } from "@/services/nfse-configuracao.service";
import { NfseSeriesSection } from "./nfse-series-section";

interface NfseConfiguracaoFormProps {
	idempresa: string;
}

export function NfseConfiguracaoForm({ idempresa }: NfseConfiguracaoFormProps) {
	const queryClient = useQueryClient();

	const { data: config, isLoading } = useQuery({
		queryKey: ["nfse-configuracao", idempresa],
		queryFn: () => nfseConfiguracaoService.buscar(idempresa),
	});

	const { data: certificados = [] } = useQuery({
		queryKey: ["certificados-digitais-nfse", idempresa],
		queryFn: () => nfseConfiguracaoService.listarCertificados(idempresa),
	});

	const { data: series = [] } = useQuery({
		queryKey: ["nfse-series", idempresa],
		queryFn: () => nfseConfiguracaoService.listarSeries(idempresa),
	});

	const form = useForm<
		z.input<typeof nfseConfiguracaoSchema>,
		unknown,
		z.output<typeof nfseConfiguracaoSchema>
	>({
		resolver: zodResolver(nfseConfiguracaoSchema),
		values: config
			? {
					ambiente: config.ambiente,
					provedor: config.provedor,
					codigomunicipioibge: config.codigomunicipioibge ?? "",
					versaolayout: config.versaolayout,
					urlwsdl: config.urlwsdl ?? "",
					urlsoperacao: {
						emissao: config.urlsoperacao?.emissao ?? "",
						consulta: config.urlsoperacao?.consulta ?? "",
						cancelamento: config.urlsoperacao?.cancelamento ?? "",
					},
					usarlotesincrono: config.usarlotesincrono,
					idcertificadoativo: config.idcertificadoativo ?? null,
					ultimaidserie: config.ultimaidserie ?? null,
				}
			: undefined,
	});

	const salvarMutation = useMutation({
		mutationFn: (dados: z.output<typeof nfseConfiguracaoSchema>) => {
			const modoDps =
				dados.provedor === "betha" && isLayoutNfseDps(dados.versaolayout);
			const urls = dados.urlsoperacao;
			const urlsoperacao =
				dados.provedor === "betha" && !modoDps && urls
					? {
							emissao: urls.emissao?.trim() || null,
							consulta: urls.consulta?.trim() || null,
							cancelamento: urls.cancelamento?.trim() || null,
						}
					: null;

			return nfseConfiguracaoService.atualizar(idempresa, {
				...dados,
				urlwsdl: modoDps
					? (dados.urlwsdl?.trim() || BETHA_DPS_WSDL)
					: dados.urlwsdl,
				usarlotesincrono: modoDps ? false : dados.usarlotesincrono,
				urlsoperacao,
			});
		},
		onSuccess: () => {
			toast.success("Configuração NFS-e salva");
			queryClient.invalidateQueries({
				queryKey: ["nfse-configuracao", idempresa],
			});
		},
		onError: () => toast.error("Erro ao salvar configuração NFS-e"),
	});

	const provedorAtual = form.watch("provedor");
	const layoutAtual = form.watch("versaolayout");
	const modoDps =
		provedorAtual === "betha" && isLayoutNfseDps(layoutAtual);

	if (isLoading) {
		return <p className="text-muted-foreground">Carregando...</p>;
	}

	return (
		<div className="space-y-8">
			<form
				className="space-y-4"
				onSubmit={form.handleSubmit((dados) => salvarMutation.mutate(dados))}
			>
				<FieldGroup>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="ambiente">Ambiente</FieldLabel>
							<Select
								value={String(form.watch("ambiente"))}
								onValueChange={(v) => form.setValue("ambiente", Number(v))}
							>
								<SelectTrigger id="ambiente">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="2">Homologação</SelectItem>
									<SelectItem value="1">Produção</SelectItem>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="provedor">Provedor</FieldLabel>
							<Select
								value={form.watch("provedor")}
								onValueChange={(v) => form.setValue("provedor", v)}
							>
								<SelectTrigger id="provedor">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{NFSE_PROVEDORES.map((p) => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					</div>

					{provedorAtual === "betha" ? (
						<Field>
							<FieldLabel htmlFor="versaolayout">Layout / modo</FieldLabel>
							<Select
								value={layoutAtual || "2.02"}
								onValueChange={(v) => {
									form.setValue("versaolayout", v);
									if (isLayoutNfseDps(v)) {
										form.setValue("urlwsdl", BETHA_DPS_WSDL);
										form.setValue("usarlotesincrono", false);
										form.setValue("urlsoperacao", {
											emissao: "",
											consulta: "",
											cancelamento: "",
										});
									}
								}}
							>
								<SelectTrigger id="versaolayout">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{NFSE_LAYOUTS.map((layout) => (
										<SelectItem key={layout.value} value={layout.value}>
											{layout.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-muted-foreground text-xs mt-1">
								{modoDps
									? "Nota Nacional (DPS): emissão assíncrona via protocolo Betha cloud."
									: "RPS e-gov (ABRASF 2.02): GerarNfse / lote no ambiente municipal Betha."}
							</p>
						</Field>
					) : null}

					<Field>
						<FieldLabel htmlFor="urlwsdl">URL / WSDL do provedor</FieldLabel>
						<Input
							id="urlwsdl"
							placeholder={modoDps ? BETHA_DPS_WSDL : undefined}
							{...form.register("urlwsdl")}
						/>
						{provedorAtual === "betha" ? (
							<p className="text-muted-foreground text-xs mt-1">
								{modoDps
									? "WSDL único DPS: nota-eletronica.betha.cloud/dps/ws/service.wsdl"
									: "Betha RPS usa WSDL por operação. Informe a URL base (ex.: gerarNfse?wsdl) e, se necessário, complete as URLs abaixo."}
							</p>
						) : null}
					</Field>

					{provedorAtual === "betha" && !modoDps ? (
						<div className="space-y-3 rounded-md border p-4">
							<p className="text-sm font-medium">URLs WSDL por operação (Betha)</p>
							<p className="text-muted-foreground text-xs">
								Homologação: https://e-gov.betha.com.br/e-nota-contribuinte-test-ws/
								gerarNfse?wsdl
							</p>
							<Field>
								<FieldLabel htmlFor="urlsoperacao-emissao">
									WSDL emissão
								</FieldLabel>
								<Input
									id="urlsoperacao-emissao"
									placeholder=".../gerarNfse?wsdl"
									{...form.register("urlsoperacao.emissao")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="urlsoperacao-consulta">
									WSDL consulta por RPS
								</FieldLabel>
								<Input
									id="urlsoperacao-consulta"
									placeholder=".../consultarNfsePorRps?wsdl"
									{...form.register("urlsoperacao.consulta")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="urlsoperacao-cancelamento">
									WSDL cancelamento (opcional)
								</FieldLabel>
								<Input
									id="urlsoperacao-cancelamento"
									placeholder=".../cancelarNfseV02?wsdl"
									{...form.register("urlsoperacao.cancelamento")}
								/>
							</Field>
						</div>
					) : null}

					{modoDps ? (
						<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
							<p className="font-medium text-foreground mb-1">
								Modo DPS (Nota Nacional)
							</p>
							<p>
								Emissão via <code>RecepcionarDps</code>; o retorno traz
								protocolo. Use &quot;Consultar status DPS&quot; no detalhe da
								nota para obter o número da NFS-e após o processamento.
							</p>
						</div>
					) : null}

					<Field>
						<FieldLabel htmlFor="codigomunicipioibge">
							Código IBGE município
						</FieldLabel>
						<Input
							id="codigomunicipioibge"
							maxLength={7}
							{...form.register("codigomunicipioibge")}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="idcertificadoativo">Certificado A1</FieldLabel>
						<Select
							value={form.watch("idcertificadoativo") ?? ""}
							onValueChange={(v) =>
								form.setValue("idcertificadoativo", v || null)
							}
						>
							<SelectTrigger id="idcertificadoativo">
								<SelectValue placeholder="Selecione o certificado" />
							</SelectTrigger>
							<SelectContent>
								{certificados.map((cert) => (
									<SelectItem key={cert.id} value={cert.id}>
										{cert.apelido} — {cert.cnpjcertificado}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<Button type="submit" disabled={salvarMutation.isPending}>
						Salvar configuração NFS-e
					</Button>
				</FieldGroup>
			</form>

			<NfseSeriesSection idempresa={idempresa} series={series} />
		</div>
	);
}
