"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useTituloAba } from "@/hooks/use-titulo-aba";
import {
	type AtualizarPlanoContasFormData,
	atualizarPlanoContasSchema,
} from "@/schemas/plano-contas.schema";
import { planoContasService } from "@/services/plano-contas.service";

type EditarPlanoContasClientProps = {
	id: string;
};

export function EditarPlanoContasClient({ id }: EditarPlanoContasClientProps) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["plano-contas", id],
		queryFn: async () => planoContasService.buscar(id),
	});

	const plano = data?.plano;

	useTituloAba(plano?.nome ?? undefined);

	const form = useForm<AtualizarPlanoContasFormData>({
		resolver: zodResolver(atualizarPlanoContasSchema),
		defaultValues: {
			nome: "",
			tipomovimento: "E",
			inativo: 0,
			classe: null,
			centrocustoobrigatorio: 0,
			tipoconta: null,
			exportaparacontabilidade: 0,
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = form;

	useEffect(() => {
		if (!plano) return;

		const tipomovimento =
			plano.tipomovimento === "S" || plano.tipomovimento === "E"
				? plano.tipomovimento
				: "E";

		reset({
			nome: plano.nome ?? "",
			tipomovimento,
			inativo: plano.inativo === 1 ? 1 : 0,
			classe: plano.classe,
			centrocustoobrigatorio: plano.centrocustoobrigatorio ?? 0,
			tipoconta: plano.tipoconta,
			exportaparacontabilidade: plano.exportaparacontabilidade ?? 0,
		});
	}, [plano, reset]);

	const tipomovimento = watch("tipomovimento");
	const centrocustoobrigatorio = watch("centrocustoobrigatorio");
	const exportaparacontabilidade = watch("exportaparacontabilidade");
	const tipoconta = watch("tipoconta");
	const inativo = watch("inativo");

	const { mutate: atualizarPlanoContas, isPending } = useMutation({
		mutationFn: (dados: AtualizarPlanoContasFormData) =>
			planoContasService.atualizar(id, {
				nome: dados.nome,
				tipomovimento: dados.tipomovimento,
				inativo: dados.inativo as 0 | 1,
				classe: dados.classe ?? undefined,
				centrocustoobrigatorio: dados.centrocustoobrigatorio ?? undefined,
				tipoconta: dados.tipoconta ?? undefined,
				exportaparacontabilidade: dados.exportaparacontabilidade ?? undefined,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			toast.success("Plano de contas atualizado com sucesso!");
			router.push("/plano-contas");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar plano de contas");
		},
	});

	const onSubmit = (dados: AtualizarPlanoContasFormData) => {
		atualizarPlanoContas(dados);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!plano) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-8">
				<p className="text-muted-foreground">Plano de contas não encontrado.</p>
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Voltar
				</Button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				{plano.codigo && (
					<div className="mb-2">
						<p className="text-sm text-muted-foreground">
							Código: <span className="font-medium text-foreground">{plano.codigo}</span>
						</p>
					</div>
				)}

				<div className="grid grid-cols-3 w-full items-start gap-4">
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
						<FieldLabel htmlFor="tipomovimento">Tipo de movimento</FieldLabel>
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

					<Field data-invalid={!!errors.tipoconta}>
						<FieldLabel htmlFor="tipoconta">Tipo de conta</FieldLabel>
						<Select
							value={tipoconta?.toString() ?? ""}
							onValueChange={(value: string) =>
								setValue("tipoconta", value ? Number(value) : null)
							}
						>
							<SelectTrigger
								className="w-full"
								aria-invalid={!!errors.tipoconta}
								aria-describedby={
									errors.tipoconta ? "tipoconta-error" : undefined
								}
							>
								<SelectValue placeholder="Selecione o tipo de conta" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1">Receita</SelectItem>
								<SelectItem value="2">Despesa</SelectItem>
								<SelectItem value="3">Investimento</SelectItem>
							</SelectContent>
						</Select>
						<FieldError errors={errors.tipoconta ? [errors.tipoconta] : []} />
					</Field>
				</div>

				<div className="flex flex-col gap-4 mt-2">
					<div className="flex items-center gap-3 rounded-lg border p-4">
						<Checkbox
							id="centrocustoobrigatorio"
							checked={centrocustoobrigatorio === 1}
							onCheckedChange={(checked) =>
								setValue("centrocustoobrigatorio", checked ? 1 : 0)
							}
						/>
						<div className="space-y-0.5">
							<FieldLabel
								htmlFor="centrocustoobrigatorio"
								className="text-base cursor-pointer"
							>
								Centro de custo obrigatório
							</FieldLabel>
							<p className="text-sm text-muted-foreground">
								Exige que um centro de custo seja informado ao utilizar este
								plano
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 rounded-lg border p-4">
						<Checkbox
							id="exportaparacontabilidade"
							checked={exportaparacontabilidade === 1}
							onCheckedChange={(checked) =>
								setValue("exportaparacontabilidade", checked ? 1 : 0)
							}
						/>
						<div className="space-y-0.5">
							<FieldLabel
								htmlFor="exportaparacontabilidade"
								className="text-base cursor-pointer"
							>
								Exportar para contabilidade
							</FieldLabel>
							<p className="text-sm text-muted-foreground">
								Inclui este plano de contas na exportação contábil
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 rounded-lg border p-4">
						<Checkbox
							id="inativo"
							checked={inativo === 1}
							onCheckedChange={(checked) =>
								setValue("inativo", checked ? 1 : 0)
							}
						/>
						<div className="space-y-0.5">
							<FieldLabel
								htmlFor="inativo"
								className="text-base cursor-pointer"
							>
								Inativo
							</FieldLabel>
							<p className="text-sm text-muted-foreground">
								Marque para desativar este plano de contas
							</p>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/plano-contas")}
					>
						Cancelar
					</Button>
					<Button type="submit" disabled={isPending}>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
