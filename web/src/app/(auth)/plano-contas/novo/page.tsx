"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CriarPlanoContasFormData,
	criarPlanoContasSchema,
} from "@/schemas/plano-contas.schema";
import { planoContasService } from "@/services/plano-contas.service";

export default function Page() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();

	const idplanocontas = searchParams.get("idplanocontas");

	const form = useForm<CriarPlanoContasFormData>({
		resolver: zodResolver(criarPlanoContasSchema),
		defaultValues: {
			idempresa: localStorageEmpresa?.id ?? "",
			nome: "",
			tipomovimento: "E",
			inativo: 0,
			idplanocontas: idplanocontas || undefined,
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const tipomovimento = watch("tipomovimento");

	const { data: planoContas, isLoading: isLoadingPlanoContas } = useQuery({
		queryKey: ["plano-contas", idplanocontas],
		queryFn: async () => {
			if (!idplanocontas)
				throw new Error("ID do plano de contas é obrigatório");
			return await planoContasService.buscar(idplanocontas);
		},
		enabled: !!idplanocontas,
	});

	// Verifica se o plano pai está inativo
	const planoPaiInativo = planoContas?.plano?.inativo === 1;

	const { mutate: criarPlanoContas, isPending } = useMutation({
		mutationFn: planoContasService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			toast.success("Plano de contas criado com sucesso!");
			router.push("/plano-contas");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar plano de contas");
		},
	});

	const onSubmit = (data: CriarPlanoContasFormData) => {
		// Valida se o plano pai está inativo
		if (idplanocontas && planoPaiInativo) {
			toast.error(
				"Não é possível criar plano de contas filho para um plano de contas pai inativo",
			);
			return;
		}

		if (!localStorageEmpresa?.id) {
			toast.error("Empresa não selecionada");
			return;
		}

		const payload = {
			idempresa: localStorageEmpresa.id,
			nome: data.nome,
			tipomovimento: data.tipomovimento,
			inativo: 0 as 0 | 1,
			idplanocontas: data.idplanocontas || undefined,
		};

		criarPlanoContas(payload);
	};

	if (isLoadingPlanoContas && idplanocontas) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-8">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			</PageContainer>
		);
	}

	// Se o plano pai estiver inativo, mostra mensagem de erro
	if (idplanocontas && planoPaiInativo) {
		return (
			<PageContainer>
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">Novo plano de contas</h1>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<div className="flex flex-col items-center justify-center py-8 gap-4">
						<p className="text-destructive text-center">
							Não é possível criar plano de contas filho para um plano de contas
							pai inativo.
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => router.back()}
						>
							Voltar
						</Button>
					</div>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo plano de contas</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<form onSubmit={handleSubmit(onSubmit)}>
					<FieldGroup>
						<div className="grid grid-cols-2 w-full items-start gap-2">
							<Field data-invalid={!!errors.nome}>
								<FieldLabel htmlFor="nome">Nome</FieldLabel>
								<Input
									id="nome"
									placeholder="Nome do plano de contas"
									aria-invalid={!!errors.nome}
									aria-describedby={errors.nome ? "nome-error" : undefined}
									{...register("nome")}
								/>
								<FieldError errors={errors.nome ? [errors.nome] : []} />
							</Field>

							<Field data-invalid={!!errors.tipomovimento}>
								<FieldLabel htmlFor="tipomovimento">
									Tipo de movimento
								</FieldLabel>
								<Select
									value={tipomovimento}
									onValueChange={(value: "E" | "S") =>
										setValue("tipomovimento", value)
									}
								>
									<SelectTrigger
										className="w-full"
										aria-invalid={!!errors.tipomovimento}
										aria-describedby={
											errors.tipomovimento ? "tipomovimento-error" : undefined
										}
									>
										<SelectValue placeholder="Selecione o tipo de movimento" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="E">Entrada</SelectItem>
										<SelectItem value="S">Saída</SelectItem>
									</SelectContent>
								</Select>
								<FieldError
									errors={errors.tipomovimento ? [errors.tipomovimento] : []}
								/>
							</Field>
						</div>

						<div className="flex justify-end gap-2 mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending ? "Criando..." : "Criar"}
							</Button>
						</div>
					</FieldGroup>
				</form>
			</div>
		</PageContainer>
	);
}
