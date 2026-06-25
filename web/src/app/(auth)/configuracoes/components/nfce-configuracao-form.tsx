"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { NFCE_CONFIG_PADRAO_LABEL } from "@/constants/nfce-config-padrao";
import {
	atualizarMeioPagamentoNfce,
	MEIOS_PAGAMENTO_NFCE_PADRAO,
	normalizarMeiosPagamentoNfce,
	resolverValorMeioPagamentoNfce,
} from "@/constants/meios-pagamento-nfce";
import { MEIOS_PAGAMENTO_PDV } from "@/lib/gourmet-utils";
import {
	type NfceConfiguracaoFormData,
	nfceConfiguracaoSchema,
} from "@/schemas/nfce-configuracao.schema";
import { nfceConfiguracaoService } from "@/services/nfce-configuracao.service";
import { NfeSeriesSection } from "./nfe-series-section";

interface NfceConfiguracaoFormProps {
	idempresa: string;
}

export function NfceConfiguracaoForm({ idempresa }: NfceConfiguracaoFormProps) {
	const queryClient = useQueryClient();
	const arquivoRef = useRef<HTMLInputElement>(null);
	const [senhaCert, setSenhaCert] = useState("");
	const [apelidoCert, setApelidoCert] = useState("");

	const { data: config, isLoading } = useQuery({
		queryKey: ["nfce-configuracao", idempresa],
		queryFn: () => nfceConfiguracaoService.buscar(idempresa),
	});

	const { data: certificados = [] } = useQuery({
		queryKey: ["certificados-digitais", idempresa],
		queryFn: () => nfceConfiguracaoService.listarCertificados(idempresa),
	});

	const form = useForm<
		z.input<typeof nfceConfiguracaoSchema>,
		unknown,
		z.output<typeof nfceConfiguracaoSchema>
	>({
		resolver: zodResolver(nfceConfiguracaoSchema),
		values: config
			? {
					ambiente: config.ambiente,
					idcertificadoativo: config.idcertificadoativo ?? null,
					idcsc_homologacao: config.idcsc_homologacao ?? "",
					csctoken_homologacao: config.csctoken_homologacao ?? "",
					idcsc_producao: config.idcsc_producao ?? "",
					csctoken_producao: config.csctoken_producao ?? "",
					contingenciaativa: config.contingenciaativa,
					meiospagamentonfce: normalizarMeiosPagamentoNfce(
						config.meiospagamentonfce ?? MEIOS_PAGAMENTO_NFCE_PADRAO,
					),
				}
			: undefined,
	});

	const salvarMutation = useMutation({
		mutationFn: (dados: NfceConfiguracaoFormData) =>
			nfceConfiguracaoService.atualizar(idempresa, {
				...dados,
				idcsc_homologacao: dados.idcsc_homologacao || null,
				csctoken_homologacao: dados.csctoken_homologacao || null,
				idcsc_producao: dados.idcsc_producao || null,
				csctoken_producao: dados.csctoken_producao || null,
			}),
		onSuccess: () => {
			toast.success("Configuração NFC-e salva");
			queryClient.invalidateQueries({
				queryKey: ["nfce-configuracao", idempresa],
			});
		},
		onError: () => toast.error("Erro ao salvar configuração NFC-e"),
	});

	const uploadMutation = useMutation({
		mutationFn: async () => {
			const arquivo = arquivoRef.current?.files?.[0];
			if (!arquivo) throw new Error("Selecione um arquivo .pfx");
			if (!senhaCert) throw new Error("Informe a senha do certificado");
			if (!apelidoCert) throw new Error("Informe um apelido");

			const buffer = await arquivo.arrayBuffer();
			const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

			return nfceConfiguracaoService.enviarCertificado({
				idempresa,
				apelido: apelidoCert,
				senha: senhaCert,
				arquivopfxBase64: base64,
			});
		},
		onSuccess: () => {
			toast.success("Certificado cadastrado");
			setSenhaCert("");
			setApelidoCert("");
			if (arquivoRef.current) arquivoRef.current.value = "";
			queryClient.invalidateQueries({
				queryKey: ["certificados-digitais", idempresa],
			});
		},
		onError: (e: Error) =>
			toast.error(e.message || "Erro ao enviar certificado"),
	});

	const ativarMutation = useMutation({
		mutationFn: (id: string) =>
			nfceConfiguracaoService.ativarCertificado(id, idempresa),
		onSuccess: () => {
			toast.success("Certificado ativado");
			queryClient.invalidateQueries({
				queryKey: ["certificados-digitais", idempresa],
			});
		},
	});

	const excluirCertMutation = useMutation({
		mutationFn: (id: string) =>
			nfceConfiguracaoService.excluirCertificado(id, idempresa),
		onSuccess: () => {
			toast.success("Certificado excluído");
			queryClient.invalidateQueries({
				queryKey: ["certificados-digitais", idempresa],
			});
		},
	});

	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	const ambiente = form.watch("ambiente");
	const contingenciaativa = form.watch("contingenciaativa");
	const meiospagamentonfce = form.watch("meiospagamentonfce");

	return (
		<div className="space-y-6">
			<form
				onSubmit={form.handleSubmit((dados) => salvarMutation.mutate(dados))}
			>
				<div className="rounded-lg border bg-card p-6">
					<h2 className="text-lg font-semibold mb-4">Parâmetros NFC-e</h2>

					{ambiente === 1 && (
						<p className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
							Atenção: ambiente de produção ativo. Emissões terão validade
							fiscal.
						</p>
					)}

					<FieldGroup className="space-y-4">
						<Field>
							<FieldLabel>Ambiente</FieldLabel>
							<Select
								value={String(ambiente)}
								onValueChange={(v) => form.setValue("ambiente", Number(v))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="2">Homologação</SelectItem>
									<SelectItem value="1">Produção</SelectItem>
								</SelectContent>
							</Select>
						</Field>

						<p className="text-muted-foreground text-sm">
							Leiaute fiscal: {NFCE_CONFIG_PADRAO_LABEL} (configurado
							automaticamente pelo sistema).
						</p>
					</FieldGroup>

					<div className="border-t pt-6">
						<h2 className="text-lg font-semibold mb-2">CSC — Homologação</h2>
						<p className="text-muted-foreground text-sm mb-4">
							Código de Segurança do Contribuinte obtido na SEFAZ da UF para
							emissão em homologação.
						</p>
						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="idcsc_homologacao">ID do CSC</FieldLabel>
								<Input
									id="idcsc_homologacao"
									placeholder="Ex.: 000001"
									maxLength={6}
									{...form.register("idcsc_homologacao")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="csctoken_homologacao">
									Token CSC
								</FieldLabel>
								<Input
									id="csctoken_homologacao"
									type="password"
									maxLength={36}
									{...form.register("csctoken_homologacao")}
								/>
							</Field>
						</div>
					</div>

					<div className="border-t pt-6">
						<h2 className="text-lg font-semibold mb-4">CSC — Produção</h2>
						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="idcsc_producao">ID do CSC</FieldLabel>
								<Input
									id="idcsc_producao"
									placeholder="Ex.: 000001"
									maxLength={6}
									{...form.register("idcsc_producao")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="csctoken_producao">Token CSC</FieldLabel>
								<Input
									id="csctoken_producao"
									type="password"
									maxLength={36}
									{...form.register("csctoken_producao")}
								/>
							</Field>
						</div>
					</div>

					<div className="border-t pt-6">
						<h2 className="text-lg font-semibold mb-2">
							Emissão por meio de pagamento
						</h2>
						<p className="text-muted-foreground text-sm mb-4">
							Se a venda no PDV usar qualquer meio marcado, a NFC-e será emitida
							pelo valor total da venda.
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							{MEIOS_PAGAMENTO_PDV.map((meio) => {
								const checked = resolverValorMeioPagamentoNfce(
									meiospagamentonfce,
									meio.id,
								);
								return (
									<Field key={meio.id}>
										<div className="flex items-center gap-3">
											<Checkbox
												id={`meio-nfce-${meio.id}`}
												checked={checked}
												onCheckedChange={(valor) => {
													form.setValue(
														"meiospagamentonfce",
														atualizarMeioPagamentoNfce(
															meiospagamentonfce,
															meio.id,
															valor === true,
														),
													);
												}}
											/>
											<FieldLabel
												htmlFor={`meio-nfce-${meio.id}`}
												className="cursor-pointer font-normal"
											>
												{meio.label}
											</FieldLabel>
										</div>
									</Field>
								);
							})}
						</div>
					</div>

					<div className="border-t pt-6">
						<Field>
							<div className="flex items-center gap-3">
								<Checkbox
									id="contingenciaativa"
									checked={contingenciaativa ?? false}
									onCheckedChange={(checked) =>
										form.setValue("contingenciaativa", checked === true)
									}
								/>
								<FieldLabel
									htmlFor="contingenciaativa"
									className="cursor-pointer font-normal"
								>
									Contingência offline ativa (uso futuro no PDV)
								</FieldLabel>
							</div>
						</Field>
					</div>

					<div className="flex justify-end pt-4 border-t">
						<Button type="submit" disabled={salvarMutation.isPending}>
							{salvarMutation.isPending ? "Salvando..." : "Salvar"}
						</Button>
					</div>
				</div>
			</form>

			<div className="rounded-lg border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Certificado digital A1</h2>
				<p className="text-muted-foreground text-sm mb-4">
					O mesmo certificado pode ser usado para NF-e e NFC-e. Cadastre e ative
					abaixo.
				</p>

				<div className="grid gap-4 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="apelido-cert-nfce">Apelido</FieldLabel>
						<Input
							id="apelido-cert-nfce"
							value={apelidoCert}
							onChange={(e) => setApelidoCert(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="senha-cert-nfce">
							Senha do certificado
						</FieldLabel>
						<Input
							id="senha-cert-nfce"
							type="password"
							value={senhaCert}
							onChange={(e) => setSenhaCert(e.target.value)}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel htmlFor="pfx-nfce">Arquivo .pfx</FieldLabel>
					<Input
						id="pfx-nfce"
						ref={arquivoRef}
						type="file"
						accept=".pfx,.p12"
					/>
				</Field>
				<Button
					type="button"
					variant="secondary"
					onClick={() => uploadMutation.mutate()}
					disabled={uploadMutation.isPending}
				>
					Enviar certificado
				</Button>

				<ul className="mt-4 space-y-2">
					{certificados.map((cert) => (
						<li
							key={cert.id}
							className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
						>
							<div>
								<p className="font-medium">{cert.apelido}</p>
								<p className="text-muted-foreground">
									Validade:{" "}
									{cert.validadefim
										? dayjs(cert.validadefim).format("DD/MM/YYYY")
										: "—"}
								</p>
							</div>
							<div className="flex items-center gap-2">
								{cert.ativo ? (
									<Badge>Ativo</Badge>
								) : (
									<Button
										size="sm"
										variant="outline"
										onClick={() => ativarMutation.mutate(cert.id)}
									>
										Ativar
									</Button>
								)}
								<Button
									size="sm"
									variant="ghost"
									onClick={() => excluirCertMutation.mutate(cert.id)}
								>
									Excluir
								</Button>
							</div>
						</li>
					))}
				</ul>
			</div>

			<NfeSeriesSection
				idempresa={idempresa}
				modelo="65"
				titulo="Série modelo 65"
				descricao="Numeração utilizada pelo PDV na emissão de cupons fiscais eletrônicos."
				queryKey="nfce-series"
			/>
		</div>
	);
}
