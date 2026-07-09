"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { emitirNfse } from "@/services/nfse-emissao.service";
import { PageContainer } from "../../components/page-container";
import { CampoTomadorNfse } from "../components/campo-tomador-nfse";
import { CardErroNfse } from "../components/card-erro-nfse";

export default function NovaNfsePage() {
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [erroEmissao, setErroEmissao] = useState<{
		titulo: string;
		motivo: string;
		codigo?: string | null;
	} | null>(null);

	const { data: config } = useQuery({
		queryKey: ["nfse-configuracao", empresa?.id],
		queryFn: () => nfseConfiguracaoService.buscar(empresa!.id),
		enabled: !!empresa?.id,
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
			exigibilidadeIss: "1",
			issRetido: "2",
			valores: { servicos: 0, iss: 0, aliquota: 0 },
			gerarFinanceiro: true,
			confirmarProducao: false,
		},
	});

	const emitirMutation = useMutation({
		mutationFn: (dados: z.output<typeof emissaoNfseSchema>) =>
			emitirNfse(empresa!.id, dados),
		onSuccess: (resultado) => {
			if (resultado.numeroNfse) {
				toast.success(`NFS-e ${resultado.numeroNfse} autorizada`);
			} else {
				toast.warning("RPS transmitido — consulte o status na listagem");
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
	const { errors } = form.formState;

	return (
		<PageContainer>
			<main className="flex flex-col gap-6 py-4 px-4 max-w-3xl">
				<header>
					<h1 className="text-2xl font-bold">Nova NFS-e</h1>
					<p className="text-muted-foreground text-sm">
						Emissão manual de serviço (RPS → NFS-e)
					</p>
				</header>

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
							<Field>
								<FieldLabel htmlFor="itemListaServico">Item LC 116</FieldLabel>
								<Input
									id="itemListaServico"
									{...form.register("itemListaServico")}
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
