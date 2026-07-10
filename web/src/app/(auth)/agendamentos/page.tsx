"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarClock, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type AutomacaoFormData,
	automacaoFormSchema,
} from "@/schemas/automacao.schema";
import {
	type Automacao,
	automacaoService,
} from "@/services/automacao.service";
import { contabilidadeCadastroService } from "@/services/contabilidade-cadastro.service";
import { emailService } from "@/services/email.service";
import { PageContainer } from "../components/page-container";

const LABELS_RECORRENCIA: Record<Automacao["recorrencia"], string> = {
	unica: "Única",
	diaria: "Diária",
	semanal: "Semanal",
	mensal: "Mensal",
};

const DIAS_SEMANA = [
	"Domingo",
	"Segunda",
	"Terça",
	"Quarta",
	"Quinta",
	"Sexta",
	"Sábado",
];

function formatarStatus(status: string | null) {
	if (!status) return "—";
	if (status === "sucesso") return "Sucesso";
	if (status === "falha") return "Falha";
	if (status === "aguardando_correcao") return "Aguardando correção";
	return status;
}

export default function AgendamentosPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [dialogAberto, setDialogAberto] = useState(false);
	const [editando, setEditando] = useState<Automacao | null>(null);
	const [historicoId, setHistoricoId] = useState<string | null>(null);

	const { data: lista = [], isLoading } = useQuery({
		queryKey: ["automacoes", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return automacaoService.listar(empresa.id);
		},
		enabled: !!empresa?.id,
	});

	const { data: contabilidade } = useQuery({
		queryKey: ["contabilidade-cadastro", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return contabilidadeCadastroService.buscar(empresa.id);
		},
		enabled: !!empresa?.id,
	});

	const { data: smtp } = useQuery({
		queryKey: ["email-smtp", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return emailService.buscarSmtp(empresa.id);
		},
		enabled: !!empresa?.id,
	});

	const { data: historico = [] } = useQuery({
		queryKey: ["automacao-execucoes", historicoId],
		queryFn: () => {
			if (!historicoId) return [];
			return automacaoService.listarExecucoes(historicoId);
		},
		enabled: !!historicoId,
	});

	const form = useForm<AutomacaoFormData>({
		resolver: zodResolver(automacaoFormSchema),
		defaultValues: {
			nome: "Envio fiscal mensal à contabilidade",
			recorrencia: "mensal",
			horario: "08:00",
			diames: 5,
			diasemana: 1,
			incluirSintegra: true,
			incluirXml: true,
			ativo: true,
		},
	});

	const recorrencia = form.watch("recorrencia");

	function abrirCriar() {
		setEditando(null);
		form.reset({
			nome: "Envio fiscal mensal à contabilidade",
			recorrencia: "mensal",
			horario: "08:00",
			diames: 5,
			diasemana: 1,
			incluirSintegra: true,
			incluirXml: true,
			ativo: true,
		});
		setDialogAberto(true);
	}

	function abrirEditar(item: Automacao) {
		setEditando(item);
		form.reset({
			nome: item.nome,
			recorrencia: item.recorrencia,
			horario: item.horario,
			diames: item.diames ?? 5,
			diasemana: item.diasemana ?? 1,
			incluirSintegra: item.parametros?.incluirSintegra !== false,
			incluirXml: item.parametros?.incluirXml !== false,
			ativo: item.ativo,
		});
		setDialogAberto(true);
	}

	const { mutate: salvar, isPending: salvando } = useMutation({
		mutationFn: async (dados: AutomacaoFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const payload = {
				nome: dados.nome,
				funcao: "envio_fiscal_contabilidade" as const,
				recorrencia: dados.recorrencia,
				horario: dados.horario,
				diames: dados.recorrencia === "mensal" ? dados.diames : null,
				diasemana: dados.recorrencia === "semanal" ? dados.diasemana : null,
				ativo: dados.ativo,
				parametros: {
					incluirSintegra: dados.incluirSintegra,
					incluirXml: dados.incluirXml,
					finalidadeSintegra: "1" as const,
				},
			};
			if (editando) {
				return automacaoService.atualizar(editando.id, payload);
			}
			return automacaoService.criar({
				idempresa: empresa.id,
				...payload,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["automacoes"] });
			setDialogAberto(false);
			toast.success(editando ? "Automação atualizada" : "Automação criada");
		},
		onError: (erro) => {
			toast.error("Erro ao salvar automação", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: executar, isPending: executando } = useMutation({
		mutationFn: (id: string) => automacaoService.executar(id),
		onSuccess: (resultado) => {
			void queryClient.invalidateQueries({ queryKey: ["automacoes"] });
			if (resultado.status === "sucesso") {
				toast.success("Automação executada", {
					description: resultado.mensagem,
				});
			} else if (resultado.status === "aguardando_correcao") {
				toast.warning("Aguardando correção de cupons", {
					description: resultado.mensagem,
				});
			} else {
				toast.error("Execução com falha", {
					description: resultado.mensagem,
				});
			}
		},
		onError: (erro) => {
			toast.error("Falha ao executar", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: excluir } = useMutation({
		mutationFn: (id: string) => automacaoService.excluir(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["automacoes"] });
			toast.success("Automação excluída");
		},
		onError: (erro) => {
			toast.error("Erro ao excluir", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: alternarAtivo } = useMutation({
		mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
			automacaoService.atualizar(id, { ativo }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["automacoes"] });
		},
		onError: (erro) => {
			toast.error("Erro ao atualizar status", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para gerenciar agendamentos.
					</p>
				</div>
			</PageContainer>
		);
	}

	const avisos: string[] = [];
	if (!smtp?.ativo) {
		avisos.push("SMTP não configurado ou inativo.");
	}
	if (!contabilidade?.ativo) {
		avisos.push("Contabilidade não cadastrada ou inativa.");
	}

	return (
		<PageContainer>
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Agendar tarefas
						</h1>
						<p className="text-sm text-muted-foreground">
							Automações recorrentes ou únicas (ex.: envio mensal de SINTEGRA e
							XMLs à contabilidade).
						</p>
					</div>
					<Button type="button" onClick={abrirCriar}>
						<Plus className="h-4 w-4" />
						Nova automação
					</Button>
				</div>

				{avisos.length > 0 && (
					<div
						className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
						role="status"
					>
						<p className="font-medium">Pré-requisitos incompletos</p>
						<ul className="mt-1 list-inside list-disc">
							{avisos.map((a) => (
								<li key={a}>{a}</li>
							))}
						</ul>
						<p className="mt-2">
							Configure em{" "}
							<Link
								href="/envio-emails"
								className="underline underline-offset-2"
							>
								Envio de e-mails
							</Link>{" "}
							e{" "}
							<Link
								href="/configuracao-contabilidade"
								className="underline underline-offset-2"
							>
								Configuração da contabilidade
							</Link>
							.
						</p>
					</div>
				)}

				{isLoading ? (
					<p className="text-sm text-muted-foreground">Carregando...</p>
				) : lista.length === 0 ? (
					<div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
						Nenhuma automação cadastrada.
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full text-sm">
							<thead className="bg-muted/50 text-left">
								<tr>
									<th className="p-3 font-medium">Nome</th>
									<th className="p-3 font-medium">Recorrência</th>
									<th className="p-3 font-medium">Próxima</th>
									<th className="p-3 font-medium">Último status</th>
									<th className="p-3 font-medium">Ativa</th>
									<th className="p-3 font-medium">Ações</th>
								</tr>
							</thead>
							<tbody>
								{lista.map((item) => (
									<tr key={item.id} className="border-t">
										<td className="p-3">
											<div className="font-medium">{item.nome}</div>
											<div className="text-xs text-muted-foreground">
												Envio fiscal (SINTEGRA / XMLs)
											</div>
										</td>
										<td className="p-3">
											{LABELS_RECORRENCIA[item.recorrencia]}
											{item.recorrencia === "mensal" && item.diames
												? ` · dia ${item.diames}`
												: ""}
											{item.recorrencia === "semanal" &&
											item.diasemana != null
												? ` · ${DIAS_SEMANA[item.diasemana]}`
												: ""}
											{` · ${item.horario}`}
										</td>
										<td className="p-3">
											{item.proximaexecucao
												? dayjs(item.proximaexecucao).format(
														"DD/MM/YYYY HH:mm",
													)
												: "—"}
										</td>
										<td className="p-3">
											{formatarStatus(item.statusultima)}
										</td>
										<td className="p-3">
											<Checkbox
												checked={item.ativo}
												onCheckedChange={(v) =>
													alternarAtivo({ id: item.id, ativo: !!v })
												}
												aria-label={
													item.ativo ? "Desativar automação" : "Ativar automação"
												}
											/>
										</td>
										<td className="p-3">
											<div className="flex flex-wrap gap-1">
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={executando}
													onClick={() => executar(item.id)}
												>
													<Play className="h-3.5 w-3.5" />
													Executar
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => abrirEditar(item)}
												>
													Editar
												</Button>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													onClick={() => setHistoricoId(item.id)}
												>
													<CalendarClock className="h-3.5 w-3.5" />
													Histórico
												</Button>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													className="text-destructive"
													onClick={() => {
														if (
															window.confirm(
																"Excluir esta automação permanentemente?",
															)
														) {
															excluir(item.id);
														}
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{editando ? "Editar automação" : "Nova automação"}
						</DialogTitle>
					</DialogHeader>
					<form
						className="space-y-4"
						onSubmit={form.handleSubmit((dados) => salvar(dados))}
					>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="auto-nome">Nome</FieldLabel>
								<Input id="auto-nome" {...form.register("nome")} />
							</Field>
							<Field>
								<FieldLabel>Função</FieldLabel>
								<Input
									value="Envio fiscal à contabilidade (SINTEGRA + XMLs)"
									disabled
									readOnly
								/>
							</Field>
							<div className="grid grid-cols-2 gap-3">
								<Field>
									<FieldLabel>Recorrência</FieldLabel>
									<Controller
										control={form.control}
										name="recorrencia"
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="unica">Única</SelectItem>
													<SelectItem value="diaria">Diária</SelectItem>
													<SelectItem value="semanal">Semanal</SelectItem>
													<SelectItem value="mensal">Mensal</SelectItem>
												</SelectContent>
											</Select>
										)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="auto-horario">Horário</FieldLabel>
									<Input
										id="auto-horario"
										type="time"
										{...form.register("horario")}
									/>
								</Field>
							</div>
							{recorrencia === "mensal" && (
								<Field>
									<FieldLabel htmlFor="auto-diames">Dia do mês (1–28)</FieldLabel>
									<Input
										id="auto-diames"
										type="number"
										min={1}
										max={28}
										{...form.register("diames")}
									/>
								</Field>
							)}
							{recorrencia === "semanal" && (
								<Field>
									<FieldLabel>Dia da semana</FieldLabel>
									<Controller
										control={form.control}
										name="diasemana"
										render={({ field }) => (
											<Select
												value={String(field.value ?? 1)}
												onValueChange={(v) => field.onChange(Number(v))}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{DIAS_SEMANA.map((label, idx) => (
														<SelectItem key={label} value={String(idx)}>
															{label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</Field>
							)}
							<div className="flex flex-col gap-2">
								<div className="flex items-center gap-2">
									<Controller
										control={form.control}
										name="incluirSintegra"
										render={({ field }) => (
											<Checkbox
												id="auto-sintegra"
												checked={field.value}
												onCheckedChange={(v) => field.onChange(!!v)}
											/>
										)}
									/>
									<FieldLabel htmlFor="auto-sintegra" className="font-normal">
										Anexar SINTEGRA
									</FieldLabel>
								</div>
								<div className="flex items-center gap-2">
									<Controller
										control={form.control}
										name="incluirXml"
										render={({ field }) => (
											<Checkbox
												id="auto-xml"
												checked={field.value}
												onCheckedChange={(v) => field.onChange(!!v)}
											/>
										)}
									/>
									<FieldLabel htmlFor="auto-xml" className="font-normal">
										Anexar ZIP de XMLs
									</FieldLabel>
								</div>
								<div className="flex items-center gap-2">
									<Controller
										control={form.control}
										name="ativo"
										render={({ field }) => (
											<Checkbox
												id="auto-ativo"
												checked={field.value}
												onCheckedChange={(v) => field.onChange(!!v)}
											/>
										)}
									/>
									<FieldLabel htmlFor="auto-ativo" className="font-normal">
										Ativa
									</FieldLabel>
								</div>
							</div>
							<p className="text-xs text-muted-foreground">
								Período padrão: mês civil anterior à execução. Se houver NFC-e
								pendente no período, a automação notifica e tenta novamente em
								6h.
							</p>
						</FieldGroup>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setDialogAberto(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={salvando}>
								{salvando ? "Salvando..." : "Salvar"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!historicoId}
				onOpenChange={(v) => !v && setHistoricoId(null)}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Histórico de execuções</DialogTitle>
					</DialogHeader>
					<div className="max-h-80 space-y-2 overflow-y-auto text-sm">
						{historico.length === 0 ? (
							<p className="text-muted-foreground">Nenhuma execução ainda.</p>
						) : (
							historico.map((ex) => (
								<div key={ex.id} className="rounded border p-2">
									<div className="flex justify-between gap-2">
										<span className="font-medium">{ex.status}</span>
										<span className="text-xs text-muted-foreground">
											{dayjs(ex.iniciadoem).format("DD/MM/YYYY HH:mm")}
										</span>
									</div>
									{ex.erro && (
										<p className="mt-1 text-xs text-destructive">{ex.erro}</p>
									)}
								</div>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}
