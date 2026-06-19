"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type EmpresaFiscalFormData,
	empresaFiscalSchema,
} from "@/schemas/empresa-fiscal.schema";
import { empresasService } from "@/services/empresas.service";

const OPCOES_REGIME = [
	{ value: "SN", label: "Simples Nacional (SN)" },
	{ value: "LP", label: "Lucro Presumido (LP)" },
	{ value: "LR", label: "Lucro Real (LR)" },
] as const;

export default function ConfiguracaoFiscalPage() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data: empresaDetalhe, isLoading } = useQuery({
		queryKey: ["empresa", empresa?.id, "fiscal"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return empresasService.buscar(empresa.id);
		},
		enabled: !!empresa,
	});

	const form = useForm<EmpresaFiscalFormData>({
		resolver: zodResolver(empresaFiscalSchema),
		defaultValues: {
			regimetributario: null,
		},
	});

	const { setValue, watch, handleSubmit, reset, formState } = form;
	const regimetributario = watch("regimetributario");

	useEffect(() => {
		if (!empresaDetalhe) return;

		reset({
			regimetributario: empresaDetalhe.regimetributario ?? "",
		});
	}, [empresaDetalhe, reset]);

	const salvarMutation = useMutation({
		mutationFn: async (dados: EmpresaFiscalFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");

			return empresasService.atualizar(empresa.id, {
				regimetributario: dados.regimetributario || null,
			});
		},
		onSuccess: () => {
			toast.success("Configuração fiscal salva com sucesso");
			queryClient.invalidateQueries({ queryKey: ["empresa", empresa?.id] });
		},
		onError: () => {
			toast.error("Não foi possível salvar a configuração fiscal");
		},
	});

	const onSubmit = (dados: EmpresaFiscalFormData) => {
		salvarMutation.mutate(dados);
	};

	if (!empresa) {
		return (
			<div className="px-4">
				<p className="text-muted-foreground text-sm">
					Selecione uma empresa para configurar os tributos.
				</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="px-4 space-y-6">
			<header>
				<h1 className="text-2xl font-bold">Configuração fiscal</h1>
				<p className="text-muted-foreground text-sm">
					Defina o regime tributário da empresa para cálculos na importação de NF
					de compra.
				</p>
			</header>

			<form onSubmit={handleSubmit(onSubmit)} className="max-w-xl">
				<FieldGroup>
					<Field data-invalid={!!formState.errors.regimetributario}>
						<FieldLabel htmlFor="regimetributario">
							Regime tributário
						</FieldLabel>
						<Select
							value={regimetributario ?? ""}
							onValueChange={(valor) =>
								setValue(
									"regimetributario",
									valor === "none" ? "" : (valor as EmpresaFiscalFormData["regimetributario"]),
									{ shouldValidate: true },
								)
							}
						>
							<SelectTrigger id="regimetributario" className="w-full">
								<SelectValue placeholder="Selecione o regime" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Não informado</SelectItem>
								{OPCOES_REGIME.map((opcao) => (
									<SelectItem key={opcao.value} value={opcao.value}>
										{opcao.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-sm text-muted-foreground">
							O regime influencia créditos de ICMS, PIS/COFINS e IPI na
							finalização da NF de compra.
						</p>
						<FieldError
							errors={
								formState.errors.regimetributario
									? [formState.errors.regimetributario]
									: []
							}
						/>
					</Field>

					<div className="flex justify-end pt-2">
						<Button type="submit" disabled={salvarMutation.isPending}>
							{salvarMutation.isPending ? "Salvando..." : "Salvar"}
						</Button>
					</div>
				</FieldGroup>
			</form>
		</div>
	);
}
