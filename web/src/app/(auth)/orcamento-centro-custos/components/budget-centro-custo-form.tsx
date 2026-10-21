"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
	type CriarBudgetCentroCustoFormData,
	criarBudgetCentroCustoSchema,
} from "@/schemas/centro-custo.schema";
import { budgetsCentroCustoService } from "@/services/budgets-centro-custo.service";
import {
	type CentroCusto,
	centroCustoService,
} from "@/services/centro-custo.service";
import { planoContasService } from "@/services/plano-contas.service";

export function BudgetCentroCustoForm() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const form = useForm<
		z.input<typeof criarBudgetCentroCustoSchema>,
		unknown,
		CriarBudgetCentroCustoFormData
	>({
		resolver: zodResolver(criarBudgetCentroCustoSchema),
		defaultValues: {
			idcentrocusto: "",
			idplanocontas: null,
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
		watch,
		formState: { errors },
	} = form;

	const periodicidade = watch("periodicidade");

	const { data: centrosData } = useQuery({
		queryKey: ["centros-custo", "budget", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return centroCustoService.listar({
				idempresa: empresa.id,
				formato: "lista",
				limit: 500,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	const { data: planoContasData } = useQuery({
		queryKey: ["plano-contas", "budget-cc", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return planoContasService.listar({
				idempresa: empresa.id,
				limit: 100,
				listarTudo: true,
				tipomovimento: "S",
			});
		},
		enabled: !!empresa,
	});

	const opcoesCentro = ((centrosData?.data ?? []) as CentroCusto[]).map(
		(c) => ({
			value: c.id,
			label: c.codigoreduzido
				? `${c.codigoreduzido} - ${c.nome}`
				: c.nome,
		}),
	);

	const opcoesPlano =
		planoContasData?.data.map((p) => ({
			value: p.id,
			label: p.codigo ? `${p.codigo} - ${p.nome}` : (p.nome ?? p.id),
		})) ?? [];

	const criarMutation = useMutation({
		mutationFn: async (data: CriarBudgetCentroCustoFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return budgetsCentroCustoService.criar({
				idempresa: empresa.id,
				idcentrocusto: data.idcentrocusto,
				idplanocontas: data.idplanocontas || null,
				ano: data.ano,
				periodicidade: data.periodicidade,
				mes: data.periodicidade === "A" ? null : data.mes,
				valor: data.valor,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["budgets-centro-custo"],
			});
			toast.success("Orçamento cadastrado!");
			router.push("/orcamento-centro-custos");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar orçamento");
		},
	});

	return (
		<form
			onSubmit={handleSubmit((data) => criarMutation.mutate(data))}
			className="max-w-xl space-y-4"
		>
			<FieldGroup>
				<Field data-invalid={!!errors.idcentrocusto}>
					<FieldLabel>Centro de custo *</FieldLabel>
					<Controller
						control={control}
						name="idcentrocusto"
						render={({ field }) => (
							<Combobox
								options={opcoesCentro}
								value={field.value}
								onChange={field.onChange}
								placeholder="Selecione"
							/>
						)}
					/>
					<FieldError
						errors={errors.idcentrocusto ? [errors.idcentrocusto] : []}
					/>
				</Field>

				<Field>
					<FieldLabel>Plano de contas (opcional)</FieldLabel>
					<Controller
						control={control}
						name="idplanocontas"
						render={({ field }) => (
							<Combobox
								options={opcoesPlano}
								value={field.value ?? ""}
								onChange={(v) => field.onChange(v || null)}
								placeholder="Todos / geral"
								allowEmpty
							/>
						)}
					/>
				</Field>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field data-invalid={!!errors.ano}>
						<FieldLabel htmlFor="ano">Ano *</FieldLabel>
						<Input id="ano" type="number" {...register("ano")} />
						<FieldError errors={errors.ano ? [errors.ano] : []} />
					</Field>
					<Field>
						<FieldLabel>Periodicidade</FieldLabel>
						<Controller
							control={control}
							name="periodicidade"
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="M">Mensal</SelectItem>
										<SelectItem value="A">Anual</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
					</Field>
				</div>

				{periodicidade === "M" ? (
					<Field data-invalid={!!errors.mes}>
						<FieldLabel>Mês *</FieldLabel>
						<Controller
							control={control}
							name="mes"
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : ""}
									onValueChange={(v) => field.onChange(Number(v))}
								>
									<SelectTrigger>
										<SelectValue placeholder="Mês" />
									</SelectTrigger>
									<SelectContent>
										{MESES_BUDGET.map((m) => (
											<SelectItem key={m.valor} value={String(m.valor)}>
												{m.nome}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						<FieldError errors={errors.mes ? [errors.mes] : []} />
					</Field>
				) : null}

				<Field data-invalid={!!errors.valor}>
					<FieldLabel htmlFor="valor">Valor limite *</FieldLabel>
					<Input
						id="valor"
						type="number"
						step="0.01"
						min={0}
						{...register("valor")}
					/>
					<FieldError errors={errors.valor ? [errors.valor] : []} />
				</Field>

				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Cancelar
					</Button>
					<Button type="submit" disabled={criarMutation.isPending}>
						Cadastrar
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
