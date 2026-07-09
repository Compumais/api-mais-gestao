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
import { NFSE_PROVEDORES } from "@/constants/nfse-emissao";
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
					usarlotesincrono: config.usarlotesincrono,
					idcertificadoativo: config.idcertificadoativo ?? null,
					ultimaidserie: config.ultimaidserie ?? null,
				}
			: undefined,
	});

	const salvarMutation = useMutation({
		mutationFn: (dados: z.output<typeof nfseConfiguracaoSchema>) =>
			nfseConfiguracaoService.atualizar(idempresa, dados),
		onSuccess: () => {
			toast.success("Configuração NFS-e salva");
			queryClient.invalidateQueries({
				queryKey: ["nfse-configuracao", idempresa],
			});
		},
		onError: () => toast.error("Erro ao salvar configuração NFS-e"),
	});

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

					<Field>
						<FieldLabel htmlFor="urlwsdl">URL / WSDL do provedor</FieldLabel>
						<Input id="urlwsdl" {...form.register("urlwsdl")} />
					</Field>

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
