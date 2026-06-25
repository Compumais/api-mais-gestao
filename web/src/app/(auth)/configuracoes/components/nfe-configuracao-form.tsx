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
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type NfeConfiguracaoFormData,
	nfeConfiguracaoSchema,
} from "@/schemas/nfe-configuracao.schema";
import { NFE_CONFIG_PADRAO_LABEL } from "@/constants/nfe-config-padrao";
import {
	nfeConfiguracaoService,
	type ResultadoEmissaoTeste,
	type ResultadoSefaz,
} from "@/services/nfe-configuracao.service";

interface NfeConfiguracaoFormProps {
	idempresa: string;
}

export function NfeConfiguracaoForm({ idempresa }: NfeConfiguracaoFormProps) {
	const queryClient = useQueryClient();
	const arquivoRef = useRef<HTMLInputElement>(null);
	const [senhaCert, setSenhaCert] = useState("");
	const [apelidoCert, setApelidoCert] = useState("");
	const [resultadoSefaz, setResultadoSefaz] = useState<ResultadoSefaz | null>(
		null,
	);
	const [resultadoEmissao, setResultadoEmissao] =
		useState<ResultadoEmissaoTeste | null>(null);
	const [novaSerie, setNovaSerie] = useState({
		serie: "1",
		numeroproximo: 1,
		padrao: true,
	});

	const { data: config, isLoading } = useQuery({
		queryKey: ["nfe-configuracao", idempresa],
		queryFn: () => nfeConfiguracaoService.buscar(idempresa),
	});

	const { data: certificados = [] } = useQuery({
		queryKey: ["certificados-digitais", idempresa],
		queryFn: () => nfeConfiguracaoService.listarCertificados(idempresa),
	});

	const { data: series = [] } = useQuery({
		queryKey: ["nfe-series", idempresa],
		queryFn: () => nfeConfiguracaoService.listarSeries(idempresa),
	});

	const form = useForm<
		z.input<typeof nfeConfiguracaoSchema>,
		unknown,
		z.output<typeof nfeConfiguracaoSchema>
	>({
		resolver: zodResolver(nfeConfiguracaoSchema),
		values: config
			? {
					ambiente: config.ambiente,
					idcertificadoativo: config.idcertificadoativo ?? null,
					tokenibpt: config.tokenibpt ?? "",
					emailenvioxml: config.emailenvioxml ?? "",
					infresptec_cnpj: config.infresptec_cnpj ?? "",
					infresptec_nome: config.infresptec_nome ?? "",
					infresptec_email: config.infresptec_email ?? "",
					infresptec_fone: config.infresptec_fone ?? "",
					contingenciaativa: config.contingenciaativa,
				}
			: undefined,
	});

	const salvarMutation = useMutation({
		mutationFn: (dados: NfeConfiguracaoFormData) =>
			nfeConfiguracaoService.atualizar(idempresa, dados),
		onSuccess: () => {
			toast.success("Configuração NF-e salva");
			queryClient.invalidateQueries({
				queryKey: ["nfe-configuracao", idempresa],
			});
		},
		onError: () => toast.error("Erro ao salvar configuração NF-e"),
	});

	const uploadMutation = useMutation({
		mutationFn: async () => {
			const arquivo = arquivoRef.current?.files?.[0];
			if (!arquivo) throw new Error("Selecione um arquivo .pfx");
			if (!senhaCert) throw new Error("Informe a senha do certificado");
			if (!apelidoCert) throw new Error("Informe um apelido");

			const buffer = await arquivo.arrayBuffer();
			const base64 = btoa(
				String.fromCharCode(...new Uint8Array(buffer)),
			);

			return nfeConfiguracaoService.enviarCertificado({
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
			nfeConfiguracaoService.ativarCertificado(id, idempresa),
		onSuccess: () => {
			toast.success("Certificado ativado");
			queryClient.invalidateQueries({
				queryKey: ["certificados-digitais", idempresa],
			});
		},
	});

	const excluirCertMutation = useMutation({
		mutationFn: (id: string) =>
			nfeConfiguracaoService.excluirCertificado(id, idempresa),
		onSuccess: () => {
			toast.success("Certificado excluído");
			queryClient.invalidateQueries({
				queryKey: ["certificados-digitais", idempresa],
			});
		},
	});

	const criarSerieMutation = useMutation({
		mutationFn: () =>
			nfeConfiguracaoService.criarSerie({
				idempresa,
				serie: novaSerie.serie,
				numeroproximo: novaSerie.numeroproximo,
				padrao: novaSerie.padrao,
				ativo: true,
			}),
		onSuccess: () => {
			toast.success("Série cadastrada");
			queryClient.invalidateQueries({ queryKey: ["nfe-series", idempresa] });
		},
		onError: () => toast.error("Erro ao cadastrar série"),
	});

	const testarSefazMutation = useMutation({
		mutationFn: () => nfeConfiguracaoService.testarStatusSefaz(idempresa),
		onSuccess: (data) => {
			setResultadoSefaz(data);
			if (data.pendencias?.length) {
				toast.warning("Existem pendências antes de emitir");
				return;
			}
			toast.success(`SEFAZ: ${data.cStat} - ${data.xMotivo}`);
		},
		onError: () => toast.error("Falha ao consultar SEFAZ"),
	});

	const emitirTesteMutation = useMutation({
		mutationFn: () =>
			nfeConfiguracaoService.emitirTesteHomologacao(idempresa),
		onSuccess: (data) => {
			setResultadoEmissao(data);
			if (data.pendencias?.length) {
				toast.warning("Pendências impedem a emissão de teste");
				return;
			}
			if (data.cStat === "100") {
				toast.success("NF-e de homologação autorizada");
			} else {
				toast.error(data.xMotivo ?? "Emissão rejeitada");
			}
			queryClient.invalidateQueries({ queryKey: ["nfe-series", idempresa] });
		},
		onError: () => toast.error("Falha na emissão de teste"),
	});

	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	const ambiente = form.watch("ambiente");

	return (
		<div className="max-w-3xl space-y-8">
			<form
				onSubmit={form.handleSubmit((dados) => salvarMutation.mutate(dados))}
			>
				<FieldGroup className="space-y-4">
					<h2 className="text-lg font-semibold">Parâmetros NF-e</h2>

					{ambiente === 1 && (
						<p className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
							Atenção: ambiente de produção ativo. Emissões terão validade fiscal.
						</p>
					)}

					<div className="grid gap-4 md:grid-cols-1">
						<Field>
							<FieldLabel>Ambiente</FieldLabel>
							<Select
								value={String(ambiente)}
								onValueChange={(v) =>
									form.setValue("ambiente", Number(v))
								}
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
					</div>

					<p className="text-muted-foreground text-sm">
						Leiaute fiscal: {NFE_CONFIG_PADRAO_LABEL} (configurado automaticamente
						pelo sistema).
					</p>

					<h3 className="pt-2 font-medium">Responsável técnico</h3>
					<div className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel htmlFor="infresptec_cnpj">CNPJ</FieldLabel>
							<Input id="infresptec_cnpj" {...form.register("infresptec_cnpj")} />
						</Field>
						<Field>
							<FieldLabel htmlFor="infresptec_nome">Nome</FieldLabel>
							<Input id="infresptec_nome" {...form.register("infresptec_nome")} />
						</Field>
						<Field>
							<FieldLabel htmlFor="infresptec_email">E-mail</FieldLabel>
							<Input id="infresptec_email" {...form.register("infresptec_email")} />
						</Field>
						<Field>
							<FieldLabel htmlFor="infresptec_fone">Telefone</FieldLabel>
							<Input id="infresptec_fone" {...form.register("infresptec_fone")} />
						</Field>
					</div>

					<div className="flex justify-end">
						<Button type="submit" disabled={salvarMutation.isPending}>
							{salvarMutation.isPending ? "Salvando..." : "Salvar configuração"}
						</Button>
					</div>
				</FieldGroup>
			</form>

			<section className="space-y-4 border-t pt-6">
				<h2 className="text-lg font-semibold">Certificado digital A1</h2>

				<div className="grid gap-3 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="apelido-cert">Apelido</FieldLabel>
						<Input
							id="apelido-cert"
							value={apelidoCert}
							onChange={(e) => setApelidoCert(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="senha-cert">Senha do certificado</FieldLabel>
						<Input
							id="senha-cert"
							type="password"
							value={senhaCert}
							onChange={(e) => setSenhaCert(e.target.value)}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel htmlFor="pfx">Arquivo .pfx</FieldLabel>
					<Input id="pfx" ref={arquivoRef} type="file" accept=".pfx,.p12" />
				</Field>
				<Button
					type="button"
					variant="secondary"
					onClick={() => uploadMutation.mutate()}
					disabled={uploadMutation.isPending}
				>
					Enviar certificado
				</Button>

				<ul className="space-y-2">
					{certificados.map((cert) => (
						<li
							key={cert.id}
							className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
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
			</section>

			<section className="space-y-4 border-t pt-6">
				<h2 className="text-lg font-semibold">Série modelo 55</h2>
				<div className="grid gap-3 md:grid-cols-3">
					<Field>
						<FieldLabel>Série</FieldLabel>
						<Input
							value={novaSerie.serie}
							onChange={(e) =>
								setNovaSerie((s) => ({ ...s, serie: e.target.value }))
							}
						/>
					</Field>
					<Field>
						<FieldLabel>Próximo número</FieldLabel>
						<Input
							type="number"
							min={1}
							value={novaSerie.numeroproximo}
							onChange={(e) =>
								setNovaSerie((s) => ({
									...s,
									numeroproximo: Number(e.target.value),
								}))
							}
						/>
					</Field>
					<div className="flex items-end">
						<Button
							type="button"
							onClick={() => criarSerieMutation.mutate()}
							disabled={criarSerieMutation.isPending}
						>
							Adicionar série
						</Button>
					</div>
				</div>

				<ul className="space-y-2 text-sm">
					{series.map((s) => (
						<li key={s.id} className="rounded-md border p-3">
							Série {s.serie} — próximo nº {s.numeroproximo}
							{s.padrao && (
								<Badge className="ml-2" variant="secondary">
									Padrão
								</Badge>
							)}
						</li>
					))}
				</ul>
			</section>

			<section className="space-y-4 border-t pt-6">
				<h2 className="text-lg font-semibold">Testes SEFAZ</h2>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => testarSefazMutation.mutate()}
						disabled={testarSefazMutation.isPending}
					>
						Testar conexão SEFAZ
					</Button>
					<Button
						type="button"
						onClick={() => emitirTesteMutation.mutate()}
						disabled={
							emitirTesteMutation.isPending || ambiente !== 2
						}
					>
						Emitir NF teste homologação
					</Button>
				</div>

				{resultadoSefaz?.pendencias?.map((p) => (
					<p key={p.codigo} className="text-sm text-amber-600">
						{p.mensagem}
					</p>
				))}
				{resultadoSefaz?.cStat && (
					<p className="text-sm text-muted-foreground">
						Status: {resultadoSefaz.cStat} — {resultadoSefaz.xMotivo}
					</p>
				)}

				{resultadoEmissao?.pendencias?.map((p) => (
					<p key={p.codigo} className="text-sm text-amber-600">
						{p.mensagem}
					</p>
				))}
				{resultadoEmissao?.chave && (
					<p className="text-sm break-all">
						Chave: {resultadoEmissao.chave}
						<br />
						Protocolo: {resultadoEmissao.protocolo ?? "—"}
						<br />
						{resultadoEmissao.cStat} — {resultadoEmissao.xMotivo}
					</p>
				)}
			</section>
		</div>
	);
}
