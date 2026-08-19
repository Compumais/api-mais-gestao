"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDominioIntegracao } from "@/hooks/use-dominio-integracao";
import { formatDateOnlyDisplay } from "@/lib/date";
import {
	type DominioIntegracaoFormData,
	dominioIntegracaoFormSchema,
} from "@/schemas/dominio.schema";

function mensagemErroApi(erro: unknown): string {
	if (axios.isAxiosError(erro)) {
		const data = erro.response?.data as { error?: string } | undefined;
		if (data?.error) return data.error;
		if (erro.message) return erro.message;
	}
	if (erro instanceof Error) return erro.message;
	return "Erro desconhecido";
}

const LABEL_STATUS: Record<string, string> = {
	pendente: "Pendente",
	enviando: "Enviando",
	aguardando_processamento: "Aguardando processamento",
	armazenado: "Armazenado",
	erro: "Erro",
};

const LABEL_TIPO: Record<string, string> = {
	autorizada: "Autorizada",
	cancelamento: "Cancelamento",
};

type DominioIntegracaoSectionProps = {
	idempresa: string;
};

export function DominioIntegracaoSection({
	idempresa,
}: DominioIntegracaoSectionProps) {
	const {
		integracao,
		carregandoIntegracao,
		envios,
		carregandoEnvios,
		ativar,
		ativando,
		salvar,
		salvando,
		reenviar,
		reenviando,
	} = useDominioIntegracao(idempresa);

	const form = useForm<DominioIntegracaoFormData>({
		resolver: zodResolver(dominioIntegracaoFormSchema),
		defaultValues: {
			chavecontador: "",
			boxefile: false,
			habilitado: false,
		},
	});

	useEffect(() => {
		form.reset({
			chavecontador: "",
			boxefile: integracao?.boxefile ?? false,
			habilitado: integracao?.habilitado ?? false,
		});
	}, [integracao, form]);

	const handleAtivar = form.handleSubmit(async (dados) => {
		const chave = dados.chavecontador?.trim();
		if (!chave) {
			toast.error("Informe a chave fornecida pelo contador");
			return;
		}

		try {
			await ativar({
				idempresa,
				chavecontador: chave,
				boxefile: dados.boxefile,
			});
			toast.success("Integração Domínio ativada");
			form.setValue("chavecontador", "");
		} catch (erro) {
			toast.error("Não foi possível ativar", {
				description: mensagemErroApi(erro),
			});
		}
	});

	const handleSalvar = async (habilitado: boolean) => {
		try {
			await salvar({
				idempresa,
				habilitado,
				boxefile: form.getValues("boxefile"),
			});
			toast.success(
				habilitado ? "Envio automático habilitado" : "Envio automático pausado",
			);
		} catch (erro) {
			toast.error("Não foi possível salvar", {
				description: mensagemErroApi(erro),
			});
		}
	};

	const handleReenviar = async (id: string) => {
		try {
			await reenviar({ id, idempresa });
			toast.success("XML reenfileirado para envio");
		} catch (erro) {
			toast.error("Não foi possível reenviar", {
				description: mensagemErroApi(erro),
			});
		}
	};

	if (carregandoIntegracao) {
		return <p className="text-sm text-muted-foreground">Carregando...</p>;
	}

	return (
		<div className="space-y-6">
			<FieldGroup>
				<FieldSet>
					<FieldLegend>API Domínio</FieldLegend>
					<p className="text-sm text-muted-foreground -mt-2 mb-4">
						Cole a chave gerada pelo contador no Onvio Gestão. Cada empresa pode
						apontar para um escritório diferente.
					</p>

					{integracao?.integrationKeyConfigurada && (
						<div className="rounded-md border bg-muted/40 p-4 text-sm space-y-1">
							<p>
								<span className="text-muted-foreground">Escritório:</span>{" "}
								{integracao.nomeescritorio || "—"}
							</p>
							<p>
								<span className="text-muted-foreground">Cliente:</span>{" "}
								{integracao.nomecliente || "—"}
							</p>
							<p>
								<span className="text-muted-foreground">CNPJ confirmado:</span>{" "}
								{integracao.cnpjcliente || "—"}
							</p>
							{integracao.chavecontadorMascarada && (
								<p>
									<span className="text-muted-foreground">Chave:</span>{" "}
									{integracao.chavecontadorMascarada}
								</p>
							)}
							{integracao.ultimoerro && (
								<p className="text-destructive">{integracao.ultimoerro}</p>
							)}
						</div>
					)}

					<div className="grid grid-cols-1 gap-4">
						<Field>
							<FieldLabel htmlFor="dominio-chave">Chave do contador</FieldLabel>
							<Input
								id="dominio-chave"
								type="password"
								autoComplete="off"
								placeholder={
									integracao?.chaveConfigurada
										? "Informe uma nova chave para trocar o escritório"
										: "Cole a chave recebida do escritório"
								}
								{...form.register("chavecontador")}
							/>
						</Field>

						<div className="flex items-center gap-3 rounded-md border p-4">
							<Controller
								control={form.control}
								name="boxefile"
								render={({ field }) => (
									<Checkbox
										id="dominio-boxe"
										checked={field.value}
										onCheckedChange={(v) => {
											const checked = !!v;
											field.onChange(checked);
											if (integracao?.integrationKeyConfigurada) {
												void salvar({
													idempresa,
													boxefile: checked,
												}).catch((erro) => {
													toast.error("Não foi possível salvar", {
														description: mensagemErroApi(erro),
													});
												});
											}
										}}
									/>
								)}
							/>
							<FieldLabel htmlFor="dominio-boxe" className="font-medium">
								Contador usa BOX-e (armazenamento XML na nuvem)
							</FieldLabel>
						</div>

						{integracao?.integrationKeyConfigurada && (
							<div className="flex items-center gap-3 rounded-md border p-4">
								<Controller
									control={form.control}
									name="habilitado"
									render={({ field }) => (
										<Checkbox
											id="dominio-habilitado"
											checked={field.value}
											onCheckedChange={(v) => {
												const checked = !!v;
												field.onChange(checked);
												void handleSalvar(checked);
											}}
										/>
									)}
								/>
								<FieldLabel
									htmlFor="dominio-habilitado"
									className="font-medium"
								>
									Enviar XMLs automaticamente após autorização/cancelamento
								</FieldLabel>
							</div>
						)}
					</div>
				</FieldSet>
			</FieldGroup>

			<Button
				type="button"
				onClick={handleAtivar}
				disabled={ativando || salvando}
			>
				{ativando ? "Validando..." : "Validar e ativar"}
			</Button>

			<div className="space-y-3">
				<h2 className="text-base font-medium">Últimos envios</h2>
				{carregandoEnvios ? (
					<p className="text-sm text-muted-foreground">Carregando envios...</p>
				) : envios.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Nenhum XML enviado ainda.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Data</TableHead>
								<TableHead>Documento</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Ação</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{envios.map((envio) => (
								<TableRow key={envio.id}>
									<TableCell>{formatDateOnlyDisplay(envio.criadoem)}</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span>
												{envio.modelo === "65" ? "NFC-e" : "NF-e"}{" "}
												{envio.numeronotafiscal || "—"}
											</span>
											{envio.chavenfe && (
												<span className="text-xs text-muted-foreground font-mono">
													{envio.chavenfe}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>{LABEL_TIPO[envio.tipo] ?? envio.tipo}</TableCell>
									<TableCell>
										<Badge
											variant={
												envio.status === "erro"
													? "destructive"
													: envio.status === "armazenado"
														? "default"
														: "secondary"
											}
										>
											{LABEL_STATUS[envio.status] ?? envio.status}
										</Badge>
										{envio.mensagemretorno && (
											<p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
												{envio.mensagemretorno}
											</p>
										)}
									</TableCell>
									<TableCell className="text-right">
										{envio.status !== "enviando" && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={reenviando}
												onClick={() => void handleReenviar(envio.id)}
											>
												Reenviar
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}
