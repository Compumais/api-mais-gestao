"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
	type NfeConfiguracaoFormData,
	nfeConfiguracaoSchema,
} from "@/schemas/nfe-configuracao.schema";
import { NFE_CONFIG_PADRAO_LABEL } from "@/constants/nfe-config-padrao";
import {
	nfeConfiguracaoService,
	type ResultadoEmissaoTeste,
	type ResultadoSefaz,
} from "@/services/nfe-configuracao.service";
import { NfeSeriesSection } from "./nfe-series-section";

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

	const { data: config, isLoading } = useQuery({
		queryKey: ["nfe-configuracao", idempresa],
		queryFn: () => nfeConfiguracaoService.buscar(idempresa),
	});

	const { data: certificados = [] } = useQuery({
		queryKey: ["certificados-digitais", idempresa],
		queryFn: () => nfeConfiguracaoService.listarCertificados(idempresa),
	});

	const form = useForm<NfeConfiguracaoFormData>({
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
			const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

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
		mutationFn: () => nfeConfiguracaoService.emitirTesteHomologacao(idempresa),
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
		<div className="space-y-6">
			<form
				onSubmit={form.handleSubmit((dados) => salvarMutation.mutate(dados))}
			>
				<div className="rounded-lg border bg-card p-6">
					<h2 className="text-lg font-semibold mb-4">Parâmetros NF-e</h2>

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
							Leiaute fiscal: {NFE_CONFIG_PADRAO_LABEL} (configurado
							automaticamente pelo sistema).
						</p>
					</FieldGroup>

					<div className="border-t pt-6">
						<h2 className="text-lg font-semibold mb-4">Responsável técnico</h2>
						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="infresptec_cnpj">CNPJ</FieldLabel>
								<Input
									id="infresptec_cnpj"
									{...form.register("infresptec_cnpj")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="infresptec_nome">Nome</FieldLabel>
								<Input
									id="infresptec_nome"
									{...form.register("infresptec_nome")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="infresptec_email">E-mail</FieldLabel>
								<Input
									id="infresptec_email"
									{...form.register("infresptec_email")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="infresptec_fone">Telefone</FieldLabel>
								<Input
									id="infresptec_fone"
									{...form.register("infresptec_fone")}
								/>
							</Field>
						</div>
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

				<div className="grid gap-4 md:grid-cols-2">
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
				modelo="55"
				titulo="Série modelo 55"
				queryKey="nfe-series"
			/>

			<div className="rounded-lg border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Testes SEFAZ</h2>
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
						disabled={emitirTesteMutation.isPending || ambiente !== 2}
					>
						Emitir NF teste homologação
					</Button>
				</div>

				{resultadoSefaz?.pendencias?.map((p) => (
					<p key={p.codigo} className="mt-4 text-sm text-amber-600">
						{p.mensagem}
					</p>
				))}
				{resultadoSefaz?.cStat && (
					<p className="mt-4 text-sm text-muted-foreground">
						Status: {resultadoSefaz.cStat} — {resultadoSefaz.xMotivo}
					</p>
				)}

				{resultadoEmissao?.pendencias?.map((p) => (
					<p key={p.codigo} className="mt-4 text-sm text-amber-600">
						{p.mensagem}
					</p>
				))}
				{resultadoEmissao?.chave && (
					<p className="mt-4 text-sm break-all">
						Chave: {resultadoEmissao.chave}
						<br />
						Protocolo: {resultadoEmissao.protocolo ?? "—"}
						<br />
						{resultadoEmissao.cStat} — {resultadoEmissao.xMotivo}
					</p>
				)}
			</div>
		</div>
	);
}
