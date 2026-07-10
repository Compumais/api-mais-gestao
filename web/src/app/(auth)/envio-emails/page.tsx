"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type ConfiguracaoSmtpFormData,
	configuracaoSmtpSchema,
} from "@/schemas/email-smtp.schema";
import { emailService } from "@/services/email.service";
import { PageContainer } from "../components/page-container";

export default function EnvioEmailsPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [dialogTesteAberto, setDialogTesteAberto] = useState(false);
	const [emailTeste, setEmailTeste] = useState("");

	const { data: config, isLoading } = useQuery({
		queryKey: ["email-smtp", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return emailService.buscarSmtp(empresa.id);
		},
		enabled: !!empresa?.id,
	});

	const form = useForm<ConfiguracaoSmtpFormData>({
		resolver: zodResolver(configuracaoSmtpSchema),
		defaultValues: {
			host: "",
			porta: 587,
			seguro: true,
			usuario: "",
			senha: "",
			emailremetente: "",
			nomremetente: "",
			ativo: true,
		},
	});

	useEffect(() => {
		if (!config) return;
		form.reset({
			host: config.host,
			porta: config.porta,
			seguro: config.seguro,
			usuario: config.usuario,
			senha: "",
			emailremetente: config.emailremetente,
			nomremetente: config.nomremetente ?? "",
			ativo: config.ativo,
		});
	}, [config, form]);

	const { mutate: salvar, isPending: salvando } = useMutation({
		mutationFn: async (dados: ConfiguracaoSmtpFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return emailService.salvarSmtp({
				idempresa: empresa.id,
				host: dados.host,
				porta: dados.porta,
				seguro: dados.seguro,
				usuario: dados.usuario,
				senha: dados.senha?.trim() || undefined,
				emailremetente: dados.emailremetente,
				nomremetente: dados.nomremetente?.trim() || null,
				ativo: dados.ativo,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["email-smtp"] });
			form.setValue("senha", "");
			toast.success("Configuração SMTP salva");
		},
		onError: (erro) => {
			toast.error("Erro ao salvar SMTP", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: testar, isPending: testando } = useMutation({
		mutationFn: async (destinatario: string) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return emailService.testarSmtp({
				idempresa: empresa.id,
				destinatario,
			});
		},
		onSuccess: () => {
			setDialogTesteAberto(false);
			toast.success("E-mail de teste enviado");
		},
		onError: (erro) => {
			toast.error("Falha no teste SMTP", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para configurar o envio de e-mails.
					</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Envio de e-mails
					</h1>
					<p className="text-sm text-muted-foreground">
						Configure o SMTP da empresa para enviar NF-e (XML e DANFE) e outros
						avisos por e-mail.
					</p>
				</div>

				{isLoading ? (
					<p className="text-sm text-muted-foreground">Carregando...</p>
				) : (
					<form
						className="space-y-6"
						onSubmit={form.handleSubmit((dados) => salvar(dados))}
					>
						<FieldGroup>
							<FieldSet>
								<FieldLegend>Servidor SMTP</FieldLegend>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<Field className="md:col-span-2">
										<FieldLabel htmlFor="smtp-host">Host</FieldLabel>
										<Input
											id="smtp-host"
											placeholder="smtp.seudominio.com.br"
											{...form.register("host")}
										/>
										{form.formState.errors.host && (
											<p className="text-xs text-destructive">
												{form.formState.errors.host.message}
											</p>
										)}
									</Field>
									<Field>
										<FieldLabel htmlFor="smtp-porta">Porta</FieldLabel>
										<Input
											id="smtp-porta"
											type="number"
											{...form.register("porta")}
										/>
										{form.formState.errors.porta && (
											<p className="text-xs text-destructive">
												{form.formState.errors.porta.message}
											</p>
										)}
									</Field>
								</div>

								<div className="flex items-center gap-3">
									<Controller
										control={form.control}
										name="seguro"
										render={({ field }) => (
											<Checkbox
												id="smtp-seguro"
												checked={field.value}
												onCheckedChange={(v) => field.onChange(!!v)}
											/>
										)}
									/>
									<div>
										<FieldLabel htmlFor="smtp-seguro" className="font-normal">
											Conexão segura (TLS)
										</FieldLabel>
										<p className="text-xs text-muted-foreground">
											Porta 587 usa STARTTLS; porta 465 usa SSL. Deixe marcado
											na maioria dos provedores.
										</p>
									</div>
								</div>
							</FieldSet>
						</FieldGroup>

						<FieldGroup>
							<FieldSet>
								<FieldLegend>Autenticação</FieldLegend>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="smtp-usuario">Usuário</FieldLabel>
										<Input
											id="smtp-usuario"
											autoComplete="username"
											{...form.register("usuario")}
										/>
										{form.formState.errors.usuario && (
											<p className="text-xs text-destructive">
												{form.formState.errors.usuario.message}
											</p>
										)}
									</Field>
									<Field>
										<FieldLabel htmlFor="smtp-senha">Senha</FieldLabel>
										<Input
											id="smtp-senha"
											type="password"
											autoComplete="new-password"
											placeholder={
												config?.senhaConfigurada
													? "•••••••• (deixe em branco para manter)"
													: "Senha SMTP"
											}
											{...form.register("senha")}
										/>
									</Field>
								</div>
							</FieldSet>
						</FieldGroup>

						<FieldGroup>
							<FieldSet>
								<FieldLegend>Remetente</FieldLegend>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="smtp-email-remetente">
											E-mail remetente
										</FieldLabel>
										<Input
											id="smtp-email-remetente"
											type="email"
											{...form.register("emailremetente")}
										/>
										{form.formState.errors.emailremetente && (
											<p className="text-xs text-destructive">
												{form.formState.errors.emailremetente.message}
											</p>
										)}
									</Field>
									<Field>
										<FieldLabel htmlFor="smtp-nome-remetente">
											Nome remetente
										</FieldLabel>
										<Input
											id="smtp-nome-remetente"
											placeholder="Mais Gestão"
											{...form.register("nomremetente")}
										/>
									</Field>
								</div>
							</FieldSet>
						</FieldGroup>

						<div className="flex items-center gap-3 rounded-md border p-4">
							<Controller
								control={form.control}
								name="ativo"
								render={({ field }) => (
									<Checkbox
										id="smtp-ativo"
										checked={field.value}
										onCheckedChange={(v) => field.onChange(!!v)}
									/>
								)}
							/>
							<div>
								<FieldLabel htmlFor="smtp-ativo" className="font-medium">
									SMTP ativo
								</FieldLabel>
								<p className="text-xs text-muted-foreground">
									Desative para impedir envios pela empresa.
								</p>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							<Button type="submit" disabled={salvando}>
								<Mail className="h-4 w-4" />
								{salvando ? "Salvando..." : "Salvar configuração"}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={!config || testando}
								onClick={() => {
									setEmailTeste(config?.emailremetente ?? "");
									setDialogTesteAberto(true);
								}}
							>
								<Send className="h-4 w-4" />
								Testar envio
							</Button>
						</div>
					</form>
				)}
			</div>

			<AlertDialog open={dialogTesteAberto} onOpenChange={setDialogTesteAberto}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Testar SMTP</AlertDialogTitle>
						<AlertDialogDescription>
							Informe o e-mail que receberá a mensagem de teste.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-2 py-2">
						<FieldLabel htmlFor="email-teste">Destinatário</FieldLabel>
						<Input
							id="email-teste"
							type="email"
							value={emailTeste}
							onChange={(e) => setEmailTeste(e.target.value)}
							placeholder="seu@email.com"
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={testando}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							disabled={testando || !emailTeste.trim()}
							onClick={(e) => {
								e.preventDefault();
								testar(emailTeste.trim());
							}}
						>
							{testando ? "Enviando..." : "Enviar teste"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}
