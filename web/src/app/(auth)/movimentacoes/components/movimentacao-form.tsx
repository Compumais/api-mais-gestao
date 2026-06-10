"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
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
	useAtualizarContaCorrenteLancamento,
	useCriarContaCorrenteLancamento,
} from "@/hooks/use-conta-corrente-lancamento";
import { contaCorrenteLancamentoService } from "@/services/conta-corrente-lancamento.service";
import { useEmpresa } from "@/hooks/use-empresa";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	type AtualizarContaCorrenteLancamentoFormData,
	atualizarContaCorrenteLancamentoSchema,
	type CriarContaCorrenteLancamentoFormData,
	criarContaCorrenteLancamentoSchema,
} from "@/schemas/conta-corrente-lancamento.schema";
import type { ContaCorrenteLancamento } from "@/services/conta-corrente-lancamento.service";
import { contasCorrentesService } from "@/services/contas-correntes.service";
import { planoContasService } from "@/services/plano-contas.service";
import { Combobox } from "@/components/ui/combobox";

const formatDateForInput = (date?: string | null): string => {
	if (!date) {
		const today = new Date();
		return today.toISOString().split("T")[0];
	}
	try {
		const d = new Date(date);
		return d.toISOString().split("T")[0];
	} catch {
		const today = new Date();
		return today.toISOString().split("T")[0];
	}
};

interface MovimentacaoFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	modo?: "criar" | "editar";
	lancamento?: ContaCorrenteLancamento | null;
}

type MovimentacaoFormValues = {
	idcontacorrente: string;
	operacao: "entrada" | "saida" | "transferencia";
	idcontacorrenteOrigem?: string;
	idcontacorrenteDestino?: string;
	data: string;
	valor: string;
	idplanocontas?: string;
	dataconciliacao?: string;
	historico?: string;
};

export function MovimentacaoForm({
	open,
	onOpenChange,
	modo = "criar",
	lancamento,
}: MovimentacaoFormProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const isMobile = useIsMobile();
	const isEdicao = modo === "editar";

	const queryClient = useQueryClient();
	const criarMutation = useCriarContaCorrenteLancamento();
	const atualizarMutation = useAtualizarContaCorrenteLancamento();

	// Mutation customizada para transferência
	const transferenciaMutation = useMutation({
		mutationFn: async (dados: {
			idcontacorrenteOrigem: string;
			idcontacorrenteDestino: string;
			datahora: string;
			valor: string;
			historico?: string;
			idplanocontas?: string;
			dataconciliacao?: string;
		}) => {
			// Criar saída na conta origem
			const lancamentoSaida = await contaCorrenteLancamentoService.criar({
				idcontacorrente: dados.idcontacorrenteOrigem,
				tipo: "S",
				datahora: dados.datahora,
				valor: dados.valor,
				historico: dados.historico
					? `Transferência: ${dados.historico}`
					: "Transferência entre contas",
				idplanocontas: dados.idplanocontas,
				dataconciliacao: dados.dataconciliacao,
			});

			// Criar entrada na conta destino
			const lancamentoEntrada = await contaCorrenteLancamentoService.criar({
				idcontacorrente: dados.idcontacorrenteDestino,
				tipo: "E",
				datahora: dados.datahora,
				valor: dados.valor,
				historico: dados.historico
					? `Transferência: ${dados.historico}`
					: "Transferência entre contas",
				idplanocontas: dados.idplanocontas,
				dataconciliacao: dados.dataconciliacao,
			});

			return { lancamentoSaida, lancamentoEntrada };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["conta-corrente-lancamentos"],
			});
			toast.success("Transferência realizada com sucesso!");
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao realizar transferência");
		},
	});

	const form = useForm<MovimentacaoFormValues>({
		resolver: zodResolver(
			isEdicao
				? atualizarContaCorrenteLancamentoSchema
				: criarContaCorrenteLancamentoSchema,
		) as any,
		defaultValues: {
			idcontacorrente: "",
			operacao: "entrada",
			idcontacorrenteOrigem: undefined,
			idcontacorrenteDestino: undefined,
			data: formatDateForInput(),
			valor: "",
			idplanocontas: undefined,
			dataconciliacao: undefined,
			historico: undefined,
		},
	});

	const {
		control,
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = form;

	const idcontacorrente = watch("idcontacorrente");
	const operacao = watch("operacao");
	const idcontacorrenteOrigem = watch("idcontacorrenteOrigem");
	const idcontacorrenteDestino = watch("idcontacorrenteDestino");

	// Buscar contas correntes
	const { data: contasCorrentesData } = useQuery({
		queryKey: ["contas-correntes", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return await contasCorrentesService.listar({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa && open,
	});

	const contasCorrentes = contasCorrentesData?.data || [];
	const temDuasOuMaisContas = contasCorrentes.length >= 2;
	const isTransferencia = operacao === "transferencia";

	// Buscar plano de contas
	const { data: planoContasData } = useQuery({
		queryKey: ["plano-contas", empresa?.id, operacao],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");

			// Determinar o tipo de movimento baseado na operação
			let tipomovimento: "E" | "S" | undefined;
			if (operacao === "entrada") {
				tipomovimento = "E";
			} else if (operacao === "saida" || operacao === "transferencia") {
				// Para saída e transferência, mostra planos de saída
				tipomovimento = "S";
			}

			return await planoContasService.listar({
				idempresa: empresa.id,
				limit: 100,
				listarTudo: true,
				tipomovimento,
			});
		},
		enabled: !!empresa && open,
	});

	// Resetar formulário quando abrir/fechar ou mudar modo
	useEffect(() => {
		if (open) {
			if (isEdicao && lancamento) {
				// Mapear tipo para operação
				const operacaoValue =
					lancamento.tipo === "C" || lancamento.tipo === "E"
						? "entrada"
						: "saida";

				reset({
					operacao: operacaoValue,
					data: formatDateForInput(lancamento.datahora),
					valor: lancamento.valor ?? "",
					idplanocontas: lancamento.idplanocontas ?? undefined,
					dataconciliacao: lancamento.dataconciliacao
						? formatDateForInput(lancamento.dataconciliacao)
						: undefined,
					historico: lancamento.historico ?? undefined,
				});
			} else {
				reset({
					idcontacorrente: "",
					operacao: "entrada",
					idcontacorrenteOrigem: undefined,
					idcontacorrenteDestino: undefined,
					data: formatDateForInput(),
					valor: "",
					idplanocontas: undefined,
					dataconciliacao: undefined,
					historico: undefined,
				});
			}
		}
	}, [open, isEdicao, lancamento, reset]);

	const onSubmit = (data: MovimentacaoFormValues) => {
		if (!empresa) {
			return;
		}

		if (isEdicao && lancamento) {
			// Mapear operação para tipo
			const tipo = data.operacao === "entrada" ? "E" : "S";

			atualizarMutation.mutate(
				{
					id: lancamento.id,
					dados: {
						tipo,
						datahora: data.data,
						valor: data.valor,
						historico: data.historico ?? undefined,
						idplanocontas: data.idplanocontas ?? undefined,
						dataconciliacao: data.dataconciliacao ?? undefined,
					},
				},
				{
					onSuccess: () => {
						onOpenChange(false);
					},
				},
			);
		} else {
			if (data.operacao === "transferencia") {
				// Criar dois lançamentos: saída na conta origem e entrada na conta destino
				const dadosForm = data as CriarContaCorrenteLancamentoFormData;

				// Validar campos obrigatórios para transferência
				if (
					!dadosForm.idcontacorrenteOrigem ||
					!dadosForm.idcontacorrenteDestino
				) {
					toast.error("Selecione as contas de origem e destino");
					return;
				}

				transferenciaMutation.mutate({
					idcontacorrenteOrigem: dadosForm.idcontacorrenteOrigem,
					idcontacorrenteDestino: dadosForm.idcontacorrenteDestino,
					datahora: data.data,
					valor: data.valor,
					historico: data.historico ?? undefined,
					idplanocontas: data.idplanocontas ?? undefined,
					dataconciliacao: data.dataconciliacao ?? undefined,
				});
			} else {
				// Mapear operação para tipo
				const tipo = data.operacao === "entrada" ? "E" : "S";

				const dadosForm = data as CriarContaCorrenteLancamentoFormData;

				// Validar conta corrente obrigatória
				if (!dadosForm.idcontacorrente) {
					toast.error("Selecione uma conta corrente");
					return;
				}

				criarMutation.mutate(
					{
						idcontacorrente: dadosForm.idcontacorrente,
						tipo,
						datahora: data.data,
						valor: data.valor,
						historico: data.historico ?? undefined,
						idplanocontas: data.idplanocontas ?? undefined,
						dataconciliacao: data.dataconciliacao ?? undefined,
					},
					{
						onSuccess: () => {
							onOpenChange(false);
						},
					},
				);
			}
		}
	};

	const isPending =
		criarMutation.isPending ||
		atualizarMutation.isPending ||
		transferenciaMutation.isPending;

	return (
		<Drawer
			open={open}
			onOpenChange={onOpenChange}
			direction={isMobile ? "bottom" : "right"}
		>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>
						{isEdicao ? "Editar Movimentação" : "Nova Movimentação"}
					</DrawerTitle>
					<DrawerDescription>
						{isEdicao
							? "Edite os dados da movimentação"
							: "Preencha os dados para criar uma nova movimentação"}
					</DrawerDescription>
				</DrawerHeader>
				<div className="flex flex-col gap-4 overflow-y-auto px-4">
					<form onSubmit={handleSubmit(onSubmit)} id="movimentacao-form">
						<FieldGroup>
							<div className="space-y-4">
								{!isEdicao && !isTransferencia && (
									<Field data-invalid={!!errors.idcontacorrente}>
										<FieldLabel htmlFor="idcontacorrente">
											Conta Corrente *
										</FieldLabel>
										<Select
											value={idcontacorrente}
											onValueChange={(value) =>
												setValue("idcontacorrente", value)
											}
										>
											<SelectTrigger
												id="idcontacorrente"
												aria-invalid={!!errors.idcontacorrente}
											>
												<SelectValue placeholder="Selecione uma conta corrente" />
											</SelectTrigger>
											<SelectContent>
												{contasCorrentes.map((conta) => (
													<SelectItem key={conta.id} value={conta.id}>
														{conta.descricao || conta.agencia || conta.id}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FieldError
											errors={
												errors.idcontacorrente ? [errors.idcontacorrente] : []
											}
										/>
									</Field>
								)}

								{!isEdicao && isTransferencia && (
									<>
										<Field data-invalid={!!errors.idcontacorrenteOrigem}>
											<FieldLabel htmlFor="idcontacorrenteOrigem">
												Conta Corrente de Origem *
											</FieldLabel>
											<Select
												value={idcontacorrenteOrigem || undefined}
												onValueChange={(value) =>
													setValue("idcontacorrenteOrigem", value)
												}
											>
												<SelectTrigger
													id="idcontacorrenteOrigem"
													aria-invalid={!!errors.idcontacorrenteOrigem}
												>
													<SelectValue placeholder="Selecione a conta de origem" />
												</SelectTrigger>
												<SelectContent>
													{contasCorrentes
														.filter(
															(conta) => conta.id !== idcontacorrenteDestino,
														)
														.map((conta) => (
															<SelectItem key={conta.id} value={conta.id}>
																{conta.descricao || conta.agencia || conta.id}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
											<FieldError
												errors={
													errors.idcontacorrenteOrigem
														? [errors.idcontacorrenteOrigem]
														: []
												}
											/>
										</Field>

										<Field data-invalid={!!errors.idcontacorrenteDestino}>
											<FieldLabel htmlFor="idcontacorrenteDestino">
												Conta Corrente de Destino *
											</FieldLabel>
											<Select
												value={idcontacorrenteDestino || undefined}
												onValueChange={(value) =>
													setValue("idcontacorrenteDestino", value)
												}
											>
												<SelectTrigger
													id="idcontacorrenteDestino"
													aria-invalid={!!errors.idcontacorrenteDestino}
												>
													<SelectValue placeholder="Selecione a conta de destino" />
												</SelectTrigger>
												<SelectContent>
													{contasCorrentes
														.filter(
															(conta) => conta.id !== idcontacorrenteOrigem,
														)
														.map((conta) => (
															<SelectItem key={conta.id} value={conta.id}>
																{conta.descricao || conta.agencia || conta.id}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
											<FieldError
												errors={
													errors.idcontacorrenteDestino
														? [errors.idcontacorrenteDestino]
														: []
												}
											/>
										</Field>
									</>
								)}

								<Field data-invalid={!!errors.operacao}>
									<FieldLabel htmlFor="operacao">Operação *</FieldLabel>
									<Select
										value={operacao}
										onValueChange={(value) => {
											setValue(
												"operacao",
												value as "entrada" | "saida" | "transferencia",
											);
											// Limpar campos de transferência quando mudar para outra operação
											if (value !== "transferencia") {
												setValue("idcontacorrenteOrigem", undefined);
												setValue("idcontacorrenteDestino", undefined);
											}
											// Limpar conta corrente quando mudar para transferência
											if (value === "transferencia") {
												setValue("idcontacorrente", "");
											}
										}}
									>
										<SelectTrigger
											id="operacao"
											aria-invalid={!!errors.operacao}
										>
											<SelectValue placeholder="Selecione a operação" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="entrada">Entrada</SelectItem>
											<SelectItem value="saida">Saída</SelectItem>
											<SelectItem
												value="transferencia"
												disabled={!temDuasOuMaisContas}
											>
												Transferência
												{!temDuasOuMaisContas && " (requer 2+ contas)"}
											</SelectItem>
										</SelectContent>
									</Select>
									<FieldError
										errors={errors.operacao ? [errors.operacao] : []}
									/>
									{!temDuasOuMaisContas && (
										<p className="text-sm text-muted-foreground">
											É necessário ter pelo menos 2 contas correntes para
											realizar transferências.
										</p>
									)}
								</Field>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Field data-invalid={!!errors.data}>
										<FieldLabel htmlFor="data">Data *</FieldLabel>
										<Input
											id="data"
											type="date"
											aria-invalid={!!errors.data}
											{...register("data")}
										/>
										<FieldError errors={errors.data ? [errors.data] : []} />
									</Field>

									<Field data-invalid={!!errors.valor}>
										<FieldLabel htmlFor="valor">Valor *</FieldLabel>
										<Input
											id="valor"
											type="number"
											step="0.01"
											min="0.01"
											placeholder="0.00"
											aria-invalid={!!errors.valor}
											{...register("valor")}
										/>
										<FieldError errors={errors.valor ? [errors.valor] : []} />
									</Field>
								</div>

								<Field data-invalid={!!errors.idplanocontas}>
									<FieldLabel htmlFor="idplanocontas">
										Plano de Contas *
									</FieldLabel>
									<Controller
										control={control}
										name="idplanocontas"
										render={({ field }) => (
											<Combobox
												options={
													planoContasData?.data.map((plano) => {
														const nivel = plano.codigo
															? (plano.codigo.match(/\./g) || []).length
															: 0;
														const prefix = "\u00A0\u00A0".repeat(nivel);
														return {
															value: plano.id,
															label: `${prefix}${plano.codigo ? `${plano.codigo} - ` : ""}${plano.nome || plano.id}`,
														};
													}) || []
												}
												value={field.value ?? ""}
												onChange={(value) => field.onChange(value || undefined)}
												placeholder="Selecione o plano de contas"
												searchPlaceholder="Buscar plano de contas..."
												emptyMessage="Nenhum plano de contas encontrado."
											/>
										)}
									/>
									<FieldError
										errors={errors.idplanocontas ? [errors.idplanocontas] : []}
									/>
								</Field>

								<Field data-invalid={!!errors.dataconciliacao}>
									<FieldLabel htmlFor="dataconciliacao">
										Data de Conciliação
									</FieldLabel>
									<Input
										id="dataconciliacao"
										type="date"
										aria-invalid={!!errors.dataconciliacao}
										{...register("dataconciliacao")}
									/>
									<FieldError
										errors={
											errors.dataconciliacao ? [errors.dataconciliacao] : []
										}
									/>
								</Field>

								<Field data-invalid={!!errors.historico}>
									<FieldLabel htmlFor="historico">Histórico</FieldLabel>
									<Textarea
										id="historico"
										placeholder="Descrição do lançamento"
										rows={3}
										aria-invalid={!!errors.historico}
										{...register("historico")}
									/>
									<FieldError
										errors={errors.historico ? [errors.historico] : []}
									/>
								</Field>
							</div>
						</FieldGroup>
					</form>
				</div>
				<DrawerFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						asChild
					>
						<DrawerClose>Cancelar</DrawerClose>
					</Button>
					<Button type="submit" form="movimentacao-form" disabled={isPending}>
						{isPending ? "Salvando..." : isEdicao ? "Salvar" : "Criar"}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
