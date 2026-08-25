"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { MESES_BUDGET } from "@/constants/budget-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type AtualizarBudgetFormData,
	atualizarBudgetSchema,
	type CriarBudgetFormData,
	criarBudgetSchema,
} from "@/schemas/budget.schema";
import { budgetsService } from "@/services/budgets.service";
import { planoContasService } from "@/services/plano-contas.service";

type BudgetFormProps = {
	modo?: "criar" | "editar";
	budgetId?: string;
	valoresIniciais?: Partial<CriarBudgetFormData>;
};

function extrairMensagemErro(error: Error, mensagemPadrao: string) {
	if (
		typeof error === "object" &&
		error !== null &&
		"response" in error &&
		typeof (error as { response?: { data?: { error?: string } } }).response
			?.data?.error === "string"
	) {
		return (error as { response: { data: { error: string } } }).response.data
			.error;
	}
	return error.message || mensagemPadrao;
}

export function BudgetForm(props: BudgetFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<
		z.input<typeof criarBudgetSchema>,
		unknown,
		CriarBudgetFormData
	>({
		resolver: zodResolver(isEdicao ? atualizarBudgetSchema : criarBudgetSchema),
		defaultValues: {
			idplanocontas: "",
			ano: new Date().getFullYear(),
			periodicidade: "M",
			mes: new Date().getMonth() + 1,
			valor: undefined,
		},
	});

	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const periodicidade = watch("periodicidade");

	const { data: planoContasData } = useQuery({
		queryKey: ["plano-contas", "budget", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return await planoContasService.listar({
				idempresa: empresa.id,
				limit: 100,
				listarTudo: true,
				tipomovimento: "S",
			});
		},
		enabled: !!empresa,
	});

	useEffect(() => {
		if (!isEdicao) return;
		if (!props.valoresIniciais) return;
		form.reset({
			...form.getValues(),
			...props.valoresIniciais,
		});
	}, [isEdicao, props.valoresIniciais, form]);

	const { mutate: criarBudget, isPending: isPendingCriar } = useMutation({
		mutationFn: budgetsService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["budgets"] });
			toast.success("Budget cadastrado com sucesso!");
			router.push("/budget");
		},
		onError: (error: Error) => {
			toast.error(extrairMensagemErro(error, "Erro ao cadastrar budget"));
		},
	});

	const { mutate: atualizarBudget, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async (dados: AtualizarBudgetFormData) => {
				if (!isEdicao || !props.budgetId) {
					throw new Error("ID do budget é obrigatório para editar");
				}
				return await budgetsService.atualizar(props.budgetId, {
					idplanocontas: dados.idplanocontas,
					ano: dados.ano,
					periodicidade: dados.periodicidade,
					mes: dados.periodicidade === "M" ? dados.mes : null,
					valor: dados.valor,
				});
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["budgets"] });
				toast.success("Budget atualizado com sucesso!");
				router.push("/budget");
			},
			onError: (error: Error) => {
				toast.error(extrairMensagemErro(error, "Erro ao atualizar budget"));
			},
		});

	const onSubmit = (data: CriarBudgetFormData) => {
		if (!empresa && !isEdicao) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			criarBudget({
				idempresa: empresa!.id,
				idplanocontas: data.idplanocontas,
				ano: data.ano,
				periodicidade: data.periodicidade,
				mes: data.periodicidade === "M" ? data.mes : null,
				valor: data.valor,
			});
			return;
		}

		atualizarBudget(data);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados do Budget</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field
							data-invalid={!!errors.idplanocontas}
							className="md:col-span-2"
						>
							<FieldLabel htmlFor="idplanocontas">Plano de contas *</FieldLabel>
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
										onChange={(value) => field.onChange(value || "")}
										placeholder="Selecione o plano de contas"
										searchPlaceholder="Buscar plano de contas..."
										emptyMessage="Nenhum plano de contas encontrado."
									/>
								)}
							/>
							<p className="text-sm text-muted-foreground">
								O limite de gastos se aplica ao plano de contas selecionado
								(contas de saída).
							</p>
							<FieldError
								errors={errors.idplanocontas ? [errors.idplanocontas] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.ano}>
							<FieldLabel htmlFor="ano">Ano *</FieldLabel>
							<Input
								id="ano"
								type="number"
								min={2000}
								max={2100}
								placeholder="Ano de vigência"
								aria-invalid={!!errors.ano}
								{...register("ano")}
							/>
							<FieldError errors={errors.ano ? [errors.ano] : []} />
						</Field>

						<Field data-invalid={!!errors.periodicidade}>
							<FieldLabel htmlFor="periodicidade">Periodicidade *</FieldLabel>
							<Controller
								control={control}
								name="periodicidade"
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={(value) => {
											field.onChange(value);
											if (value === "A") {
												setValue("mes", null);
											} else {
												setValue("mes", new Date().getMonth() + 1);
											}
										}}
									>
										<SelectTrigger
											id="periodicidade"
											aria-invalid={!!errors.periodicidade}
											className="w-full"
										>
											<SelectValue placeholder="Selecione a periodicidade" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="M">Mensal</SelectItem>
											<SelectItem value="A">Anual</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
							<FieldError
								errors={errors.periodicidade ? [errors.periodicidade] : []}
							/>
						</Field>

						{periodicidade === "M" && (
							<Field data-invalid={!!errors.mes}>
								<FieldLabel htmlFor="mes">Mês *</FieldLabel>
								<Controller
									control={control}
									name="mes"
									render={({ field }) => (
										<Select
											value={field.value ? String(field.value) : ""}
											onValueChange={(value) => field.onChange(Number(value))}
										>
											<SelectTrigger
												id="mes"
												aria-invalid={!!errors.mes}
												className="w-full"
											>
												<SelectValue placeholder="Selecione o mês" />
											</SelectTrigger>
											<SelectContent>
												{MESES_BUDGET.map((mes) => (
													<SelectItem key={mes.valor} value={String(mes.valor)}>
														{mes.nome}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
								<FieldError errors={errors.mes ? [errors.mes] : []} />
							</Field>
						)}

						<Field data-invalid={!!errors.valor}>
							<FieldLabel htmlFor="valor">Valor limite (R$) *</FieldLabel>
							<Input
								id="valor"
								type="number"
								step="0.01"
								min={0}
								placeholder="0,00"
								aria-invalid={!!errors.valor}
								{...register("valor")}
							/>
							<p className="text-sm text-muted-foreground">
								{periodicidade === "A"
									? "Valor limite para o ano inteiro."
									: "Valor limite para o mês selecionado."}
							</p>
							<FieldError errors={errors.valor ? [errors.valor] : []} />
						</Field>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Cancelar
					</Button>
					<Button type="submit" disabled={isPendingCriar || isPendingAtualizar}>
						{modo === "editar"
							? isPendingAtualizar
								? "Salvando..."
								: "Salvar"
							: isPendingCriar
								? "Cadastrando..."
								: "Cadastrar"}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
