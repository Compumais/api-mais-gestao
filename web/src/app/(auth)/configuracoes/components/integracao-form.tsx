"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
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
import { Textarea } from "@/components/ui/textarea";
import {
	useAtualizarSecaoConfiguracao,
	useAtualizarWebhook,
	useCriarChaveApi,
	useCriarWebhook,
	useDeletarChaveApi,
	useDeletarWebhook,
} from "@/hooks/use-configuracao";
import {
	type CriarChaveApiFormData,
	type CriarWebhookFormData,
	criarChaveApiSchema,
	criarWebhookSchema,
} from "@/schemas/configuracao.schema";
import type { Configuracao } from "@/services/configuracao.service";
import { useAuth } from "@/hooks/use-auth";
import {
	useConfiguracaoUsuario,
	useAtualizarConfiguracaoUsuario,
} from "@/hooks/use-configuracao-usuario";
import {
	atualizarConfiguracaoUsuarioSchema,
	type AtualizarConfiguracaoUsuarioFormData,
} from "@/schemas/configuracao-usuario.schema";
import { Eye, EyeOff } from "lucide-react";

interface IntegracaoFormProps {
	configuracao: Configuracao | undefined;
	idempresa: string;
}

export function IntegracaoForm({
	configuracao,
	idempresa,
}: IntegracaoFormProps) {
	const { user } = useAuth();
	const atualizarMutation = useAtualizarSecaoConfiguracao();
	const criarChaveApiMutation = useCriarChaveApi();
	const deletarChaveApiMutation = useDeletarChaveApi();
	const criarWebhookMutation = useCriarWebhook();
	const atualizarWebhookMutation = useAtualizarWebhook();
	const deletarWebhookMutation = useDeletarWebhook();

	const [chaveApiGerada, setChaveApiGerada] = useState<string | null>(null);
	const [mostrarDialogChave, setMostrarDialogChave] = useState(false);
	const [mostrarDialogWebhook, setMostrarDialogWebhook] = useState(false);
	const [webhookEditando, setWebhookEditando] = useState<string | null>(null);

	// Configurações globais de integrações
	const { data: configuracaoUsuario } = useConfiguracaoUsuario(idempresa);
	const atualizarConfiguracaoUsuarioMutation =
		useAtualizarConfiguracaoUsuario();

	// Verificar se usuário é proprietário
	const isProprietario = user?.perfil?.includes("proprietario") ?? false;

	// Estados para mostrar/ocultar senhas
	const [mostrarGemini, setMostrarGemini] = useState(false);
	const [mostrarOpenAI, setMostrarOpenAI] = useState(false);
	const [mostrarOpenRouter, setMostrarOpenRouter] = useState(false);
	const [mostrarAsaas, setMostrarAsaas] = useState(false);

	const formIntegracoesGlobais = useForm<AtualizarConfiguracaoUsuarioFormData>({
		resolver: zodResolver(atualizarConfiguracaoUsuarioSchema),
		defaultValues: {
			geminiApiKey: "",
			openaiApiKey: "",
			openrouterApiKey: "",
			asaasToken: "",
		},
	});

	// Atualizar valores do formulário quando configuração for carregada
	useEffect(() => {
		if (configuracaoUsuario?.integracoes) {
			formIntegracoesGlobais.reset({
				geminiApiKey: configuracaoUsuario.integracoes.geminiApiKey || "",
				openaiApiKey: configuracaoUsuario.integracoes.openaiApiKey || "",
				openrouterApiKey:
					configuracaoUsuario.integracoes.openrouterApiKey || "",
				asaasToken: configuracaoUsuario.integracoes.asaasToken || "",
			});
		}
	}, [configuracaoUsuario, formIntegracoesGlobais]);

	const handleAtualizarIntegracoesGlobais = (
		data: AtualizarConfiguracaoUsuarioFormData,
	) => {
		if (!isProprietario) {
			toast.error("Apenas o proprietário pode atualizar as configurações");
			return;
		}

		atualizarConfiguracaoUsuarioMutation.mutate(data);
	};

	const formChaveApi = useForm<CriarChaveApiFormData>({
		resolver: zodResolver(criarChaveApiSchema),
	});

	const formWebhook = useForm<CriarWebhookFormData>({
		resolver: zodResolver(criarWebhookSchema),
		defaultValues: {
			url: "",
			eventos: [],
		},
	});

	const integracao = configuracao?.integracao || {
		apis: { chaves: [] },
		webhooks: [],
		integracoesBancos: {
			habilitado: false,
			provedor: null,
			configuracoes: {},
		},
		exportacao: {
			formatoPadrao: "csv" as const,
			incluirCabecalho: true,
			separador: ",",
		},
		backup: {
			habilitado: false,
			frequencia: null,
			horario: "00:00",
			manterBackups: 30,
		},
	};

	const handleCriarChaveApi = (data: CriarChaveApiFormData) => {
		criarChaveApiMutation.mutate(
			{ idempresa, dados: data },
			{
				onSuccess: (result) => {
					setChaveApiGerada(result.chave);
					setMostrarDialogChave(true);
					formChaveApi.reset();
				},
			},
		);
	};

	const handleDeletarChaveApi = (chaveId: string) => {
		if (confirm("Tem certeza que deseja deletar esta chave de API?")) {
			deletarChaveApiMutation.mutate({ idempresa, chaveId });
		}
	};

	const handleCriarWebhook = (data: CriarWebhookFormData) => {
		if (webhookEditando) {
			atualizarWebhookMutation.mutate(
				{
					idempresa,
					webhookId: webhookEditando,
					dados: data,
				},
				{
					onSuccess: () => {
						setMostrarDialogWebhook(false);
						setWebhookEditando(null);
						formWebhook.reset();
					},
				},
			);
		} else {
			criarWebhookMutation.mutate(
				{ idempresa, dados: data },
				{
					onSuccess: () => {
						setMostrarDialogWebhook(false);
						formWebhook.reset();
					},
				},
			);
		}
	};

	const handleEditarWebhook = (webhook: (typeof integracao.webhooks)[0]) => {
		formWebhook.reset({
			url: webhook.url,
			eventos: webhook.eventos,
		});
		setWebhookEditando(webhook.id);
		setMostrarDialogWebhook(true);
	};

	const handleDeletarWebhook = (webhookId: string) => {
		if (confirm("Tem certeza que deseja deletar este webhook?")) {
			deletarWebhookMutation.mutate({ idempresa, webhookId });
		}
	};

	const handleAtualizarIntegracao = (campo: string, valor: unknown) => {
		atualizarMutation.mutate({
			idempresa,
			secao: "integracao",
			dados: {
				...integracao,
				[campo]: valor,
			},
		});
	};

	return (
		<div className="space-y-6">
			{/* Chaves de API */}
			<div className="rounded-lg border bg-card p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Chaves de API</h2>
					<Dialog
						open={mostrarDialogChave}
						onOpenChange={setMostrarDialogChave}
					>
						<DialogTrigger asChild>
							<Button
								type="button"
								onClick={() => {
									formChaveApi.reset();
									setChaveApiGerada(null);
								}}
							>
								Gerar Nova Chave
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{chaveApiGerada
										? "Chave de API Gerada"
										: "Criar Chave de API"}
								</DialogTitle>
								<DialogDescription>
									{chaveApiGerada
										? "Copie esta chave agora. Ela não será exibida novamente."
										: "Digite um nome para identificar esta chave de API."}
								</DialogDescription>
							</DialogHeader>
							{chaveApiGerada ? (
								<div className="space-y-4">
									<Field>
										<FieldLabel>Chave de API</FieldLabel>
										<Textarea
											readOnly
											value={chaveApiGerada}
											className="font-mono"
										/>
									</Field>
									<Button
										onClick={() => {
											navigator.clipboard.writeText(chaveApiGerada);
											toast.success(
												"Chave copiada para a área de transferência!",
											);
										}}
									>
										Copiar Chave
									</Button>
								</div>
							) : (
								<form
									onSubmit={formChaveApi.handleSubmit(handleCriarChaveApi)}
									className="space-y-4"
								>
									<Field>
										<FieldLabel>Nome</FieldLabel>
										<Input {...formChaveApi.register("nome")} />
										<FieldError
											errors={
												formChaveApi.formState.errors.nome
													? [formChaveApi.formState.errors.nome]
													: []
											}
										/>
									</Field>
									<Button
										type="submit"
										disabled={criarChaveApiMutation.isPending}
									>
										{criarChaveApiMutation.isPending ? "Criando..." : "Criar"}
									</Button>
								</form>
							)}
						</DialogContent>
					</Dialog>
				</div>

				<div className="space-y-2">
					{integracao.apis.chaves.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nenhuma chave de API criada
						</p>
					) : (
						integracao.apis.chaves.map((chave) => (
							<div
								key={chave.id}
								className="flex items-center justify-between rounded border p-3"
							>
								<div>
									<p className="font-medium">{chave.nome}</p>
									<p className="text-muted-foreground text-sm">
										Criada em: {format(new Date(chave.criadoEm), "dd/MM/yyyy")}
									</p>
									{chave.ultimoUso && (
										<p className="text-muted-foreground text-sm">
											Último uso:{" "}
											{format(new Date(chave.ultimoUso), "dd/MM/yyyy HH:mm")}
										</p>
									)}
								</div>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleDeletarChaveApi(chave.id)}
									disabled={deletarChaveApiMutation.isPending}
								>
									Deletar
								</Button>
							</div>
						))
					)}
				</div>
			</div>

			{/* Webhooks */}
			<div className="rounded-lg border bg-card p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Webhooks</h2>
					<Dialog
						open={mostrarDialogWebhook}
						onOpenChange={setMostrarDialogWebhook}
					>
						<DialogTrigger asChild>
							<Button
								type="button"
								onClick={() => {
									formWebhook.reset();
									setWebhookEditando(null);
								}}
							>
								Adicionar Webhook
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{webhookEditando ? "Editar Webhook" : "Criar Webhook"}
								</DialogTitle>
								<DialogDescription>
									Configure o webhook para receber notificações de eventos.
								</DialogDescription>
							</DialogHeader>
							<form
								onSubmit={formWebhook.handleSubmit(handleCriarWebhook)}
								className="space-y-4"
							>
								<Field>
									<FieldLabel>URL</FieldLabel>
									<Input {...formWebhook.register("url")} />
									<FieldError
										errors={
											formWebhook.formState.errors.url
												? [formWebhook.formState.errors.url]
												: []
										}
									/>
								</Field>
								<Field>
									<FieldLabel>Eventos</FieldLabel>
									<div className="space-y-2">
										{["payment", "invoice", "transfer"].map((evento) => (
											<div key={evento} className="flex items-center gap-2">
												<Checkbox
													checked={formWebhook
														.watch("eventos")
														?.includes(evento)}
													onCheckedChange={(checked) => {
														const eventos =
															formWebhook.getValues("eventos") || [];
														if (checked) {
															formWebhook.setValue("eventos", [
																...eventos,
																evento,
															]);
														} else {
															formWebhook.setValue(
																"eventos",
																eventos.filter((e) => e !== evento),
															);
														}
													}}
												/>
												<FieldLabel className="cursor-pointer">
													{evento}
												</FieldLabel>
											</div>
										))}
									</div>
								</Field>
								<Button
									type="submit"
									disabled={
										criarWebhookMutation.isPending ||
										atualizarWebhookMutation.isPending
									}
								>
									{webhookEditando
										? atualizarWebhookMutation.isPending
											? "Salvando..."
											: "Salvar"
										: criarWebhookMutation.isPending
											? "Criando..."
											: "Criar"}
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				</div>

				<div className="space-y-2">
					{integracao.webhooks.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nenhum webhook configurado
						</p>
					) : (
						integracao.webhooks.map((webhook) => (
							<div
								key={webhook.id}
								className="flex items-center justify-between rounded border p-3"
							>
								<div>
									<p className="font-medium">{webhook.url}</p>
									<p className="text-muted-foreground text-sm">
										Eventos: {webhook.eventos.join(", ")}
									</p>
									<p className="text-muted-foreground text-sm">
										Status: {webhook.ativo ? "Ativo" : "Inativo"}
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleEditarWebhook(webhook)}
									>
										Editar
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => handleDeletarWebhook(webhook.id)}
										disabled={deletarWebhookMutation.isPending}
									>
										Deletar
									</Button>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Integrações Globais */}
			<div className="rounded-lg border bg-card p-6">
				<div className="mb-4">
					<h2 className="text-lg font-semibold mb-2">Integrações Globais</h2>
					<p className="text-sm text-muted-foreground">
						{isProprietario
							? "Configure as chaves de API e tokens que serão compartilhados entre todas as suas empresas."
							: "Estas são as configurações do proprietário da empresa. Você pode visualizar, mas não pode editar."}
					</p>
				</div>

				<form
					onSubmit={formIntegracoesGlobais.handleSubmit(
						handleAtualizarIntegracoesGlobais,
					)}
					className="space-y-4"
				>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="geminiApiKey">
								Chave da API Gemini
							</FieldLabel>
							<div className="relative">
								<Input
									id="geminiApiKey"
									type={mostrarGemini ? "text" : "password"}
									readOnly={!isProprietario}
									placeholder={
										isProprietario
											? "Digite a chave da API Gemini"
											: "Configurada pelo proprietário"
									}
									{...formIntegracoesGlobais.register("geminiApiKey")}
									className={!isProprietario ? "bg-muted" : ""}
								/>
								{isProprietario && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3"
										onClick={() => setMostrarGemini(!mostrarGemini)}
									>
										{mostrarGemini ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
								)}
							</div>
							<FieldError
								errors={
									formIntegracoesGlobais.formState.errors.geminiApiKey
										? [formIntegracoesGlobais.formState.errors.geminiApiKey]
										: []
								}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="openaiApiKey">
								Chave de API OpenAI
							</FieldLabel>
							<div className="relative">
								<Input
									id="openaiApiKey"
									type={mostrarOpenAI ? "text" : "password"}
									readOnly={!isProprietario}
									placeholder={
										isProprietario
											? "Digite a chave da API OpenAI"
											: "Configurada pelo proprietário"
									}
									{...formIntegracoesGlobais.register("openaiApiKey")}
									className={!isProprietario ? "bg-muted" : ""}
								/>
								{isProprietario && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3"
										onClick={() => setMostrarOpenAI(!mostrarOpenAI)}
									>
										{mostrarOpenAI ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
								)}
							</div>
							<FieldError
								errors={
									formIntegracoesGlobais.formState.errors.openaiApiKey
										? [formIntegracoesGlobais.formState.errors.openaiApiKey]
										: []
								}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="openrouterApiKey">
								Chave de API OpenRouter
							</FieldLabel>
							<div className="relative">
								<Input
									id="openrouterApiKey"
									type={mostrarOpenRouter ? "text" : "password"}
									readOnly={!isProprietario}
									placeholder={
										isProprietario
											? "Digite a chave da API OpenRouter"
											: "Configurada pelo proprietário"
									}
									{...formIntegracoesGlobais.register("openrouterApiKey")}
									className={!isProprietario ? "bg-muted" : ""}
								/>
								{isProprietario && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3"
										onClick={() => setMostrarOpenRouter(!mostrarOpenRouter)}
									>
										{mostrarOpenRouter ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
								)}
							</div>
							<FieldError
								errors={
									formIntegracoesGlobais.formState.errors.openrouterApiKey
										? [formIntegracoesGlobais.formState.errors.openrouterApiKey]
										: []
								}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="asaasToken">Token Asaas</FieldLabel>
							<div className="relative">
								<Input
									id="asaasToken"
									type={mostrarAsaas ? "text" : "password"}
									readOnly={!isProprietario}
									placeholder={
										isProprietario
											? "Digite o token Asaas"
											: "Configurado pelo proprietário"
									}
									{...formIntegracoesGlobais.register("asaasToken")}
									className={!isProprietario ? "bg-muted" : ""}
								/>
								{isProprietario && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3"
										onClick={() => setMostrarAsaas(!mostrarAsaas)}
									>
										{mostrarAsaas ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
								)}
							</div>
							<FieldError
								errors={
									formIntegracoesGlobais.formState.errors.asaasToken
										? [formIntegracoesGlobais.formState.errors.asaasToken]
										: []
								}
							/>
						</Field>

						{isProprietario && (
							<div className="flex justify-end">
								<Button
									type="submit"
									disabled={atualizarConfiguracaoUsuarioMutation.isPending}
								>
									{atualizarConfiguracaoUsuarioMutation.isPending
										? "Salvando..."
										: "Salvar Configurações"}
								</Button>
							</div>
						)}
					</FieldGroup>
				</form>
			</div>

			{/* Integrações Bancárias */}
			<div className="rounded-lg border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Integrações Bancárias</h2>
				<FieldGroup>
					<Field>
						<div className="flex items-center gap-3">
							<Checkbox
								id="integracoes-bancos"
								checked={integracao.integracoesBancos.habilitado}
								onCheckedChange={(checked) =>
									handleAtualizarIntegracao("integracoesBancos", {
										...integracao.integracoesBancos,
										habilitado: checked,
									})
								}
							/>
							<FieldLabel
								htmlFor="integracoes-bancos"
								className="cursor-pointer"
							>
								Habilitar integrações bancárias
							</FieldLabel>
						</div>
					</Field>
					{integracao.integracoesBancos.habilitado && (
						<Field>
							<FieldLabel>Provedor</FieldLabel>
							<Select
								value={integracao.integracoesBancos.provedor || ""}
								onValueChange={(value) =>
									handleAtualizarIntegracao("integracoesBancos", {
										...integracao.integracoesBancos,
										provedor: value,
									})
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione um provedor" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pluggto">Pluggto</SelectItem>
									<SelectItem value="openbanking">Open Banking</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					)}
				</FieldGroup>
			</div>

			{/* Exportação de Dados */}
			<div className="rounded-lg border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Exportação de Dados</h2>
				<FieldGroup>
					<Field>
						<FieldLabel>Formato Padrão</FieldLabel>
						<Select
							value={integracao.exportacao.formatoPadrao}
							onValueChange={(value) =>
								handleAtualizarIntegracao("exportacao", {
									...integracao.exportacao,
									formatoPadrao: value as "csv" | "excel" | "pdf",
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="csv">CSV</SelectItem>
								<SelectItem value="excel">Excel</SelectItem>
								<SelectItem value="pdf">PDF</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<div className="flex items-center gap-3">
							<Checkbox
								id="incluir-cabecalho"
								checked={integracao.exportacao.incluirCabecalho}
								onCheckedChange={(checked) =>
									handleAtualizarIntegracao("exportacao", {
										...integracao.exportacao,
										incluirCabecalho: checked,
									})
								}
							/>
							<FieldLabel
								htmlFor="incluir-cabecalho"
								className="cursor-pointer"
							>
								Incluir cabeçalho
							</FieldLabel>
						</div>
					</Field>
					{integracao.exportacao.formatoPadrao === "csv" && (
						<Field>
							<FieldLabel>Separador</FieldLabel>
							<Input
								value={integracao.exportacao.separador}
								onChange={(e) =>
									handleAtualizarIntegracao("exportacao", {
										...integracao.exportacao,
										separador: e.target.value,
									})
								}
							/>
						</Field>
					)}
				</FieldGroup>
			</div>

			{/* Backup Automático */}
			<div className="rounded-lg border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Backup Automático</h2>
				<FieldGroup>
					<Field>
						<div className="flex items-center gap-3">
							<Checkbox
								id="backup-habilitado"
								checked={integracao.backup.habilitado}
								onCheckedChange={(checked) =>
									handleAtualizarIntegracao("backup", {
										...integracao.backup,
										habilitado: checked,
									})
								}
							/>
							<FieldLabel
								htmlFor="backup-habilitado"
								className="cursor-pointer"
							>
								Habilitar backup automático
							</FieldLabel>
						</div>
					</Field>
					{integracao.backup.habilitado && (
						<>
							<Field>
								<FieldLabel>Frequência</FieldLabel>
								<Select
									value={integracao.backup.frequencia || ""}
									onValueChange={(value) =>
										handleAtualizarIntegracao("backup", {
											...integracao.backup,
											frequencia:
												value === ""
													? null
													: (value as "diario" | "semanal" | "mensal"),
										})
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione a frequência" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="diario">Diário</SelectItem>
										<SelectItem value="semanal">Semanal</SelectItem>
										<SelectItem value="mensal">Mensal</SelectItem>
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel>Horário</FieldLabel>
								<Input
									type="time"
									value={integracao.backup.horario}
									onChange={(e) =>
										handleAtualizarIntegracao("backup", {
											...integracao.backup,
											horario: e.target.value,
										})
									}
								/>
							</Field>
							<Field>
								<FieldLabel>Manter Backups (dias)</FieldLabel>
								<Input
									type="number"
									min="1"
									max="365"
									value={integracao.backup.manterBackups}
									onChange={(e) =>
										handleAtualizarIntegracao("backup", {
											...integracao.backup,
											manterBackups: parseInt(e.target.value, 10),
										})
									}
								/>
							</Field>
						</>
					)}
				</FieldGroup>
			</div>
		</div>
	);
}
