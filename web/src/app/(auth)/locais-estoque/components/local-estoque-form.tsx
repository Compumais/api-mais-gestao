"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldDescription,
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
	type CriarLocalEstoqueForm,
	criarLocalEstoqueSchema,
} from "@/schemas/local-estoque.schema";
import {
	type LocalEstoque,
	localEstoqueService,
} from "@/services/local-estoque.service";

type LocalEstoqueFormProps = {
	modo: "criar" | "editar";
	localId?: string;
	valoresIniciais?: Partial<LocalEstoque>;
};

export function LocalEstoqueForm({
	modo,
	localId,
	valoresIniciais,
}: LocalEstoqueFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const idempresa = localStorageEmpresa?.id ?? "";

	const form = useForm<CriarLocalEstoqueForm>({
		resolver: zodResolver(criarLocalEstoqueSchema),
		defaultValues: {
			idempresa: valoresIniciais?.idempresa ?? idempresa ?? "",
			codigo: valoresIniciais?.codigo ?? "",
			descricao: valoresIniciais?.descricao ?? "",
			posse: valoresIniciais?.posse ?? "P",
			tipo: valoresIniciais?.tipo ? Number(valoresIniciais.tipo) : 1,
			inativo: valoresIniciais?.inativo ?? 0,
			padrao: valoresIniciais?.padrao ?? 0,
		},
	});

	const {
		control,
		handleSubmit,
		setValue,
		getValues,
		formState: { errors },
	} = form;

	useEffect(() => {
		if (idempresa && !getValues("idempresa")) {
			setValue("idempresa", idempresa);
		}
	}, [idempresa, getValues, setValue]);

	const criarMutation = useMutation({
		mutationFn: (dados: CriarLocalEstoqueForm) =>
			localEstoqueService.criar({
				...dados,
				idempresa: dados.idempresa || idempresa || "",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["locais-estoque"] });
			toast.success("Local de estoque criado com sucesso!");
			router.push("/locais-estoque");
		},
		onError: (err: unknown) => {
			const errObj = err as { message?: string; response?: { data?: { error?: string; message?: string } } };
			const msg =
				errObj?.response?.data?.message ||
				errObj?.response?.data?.error ||
				errObj?.message ||
				"Erro ao criar local de estoque";
			toast.error(msg);
		},
	});

	const atualizarMutation = useMutation({
		mutationFn: (dados: CriarLocalEstoqueForm) =>
			localEstoqueService.atualizar(localId as string, dados),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["locais-estoque"] });
			queryClient.invalidateQueries({ queryKey: ["local-estoque", localId] });
			toast.success("Local de estoque atualizado com sucesso!");
			router.push("/locais-estoque");
		},
		onError: (err: unknown) => {
			const errObj = err as { message?: string; response?: { data?: { error?: string; message?: string } } };
			const msg =
				errObj?.response?.data?.message ||
				errObj?.response?.data?.error ||
				errObj?.message ||
				"Erro ao atualizar local de estoque";
			toast.error(msg);
		},
	});

	function onSubmit(dados: CriarLocalEstoqueForm) {
		if (!dados.descricao?.trim() && !dados.codigo?.trim()) {
			toast.error(
				"Informe ao menos o código ou a descrição do local de estoque",
			);
			return;
		}
		if (modo === "criar") {
			criarMutation.mutate({
				...dados,
				idempresa: dados.idempresa || idempresa || "",
				tipo: dados.tipo ? Number(dados.tipo) : 1,
			});
		} else {
			atualizarMutation.mutate({
				...dados,
				tipo: dados.tipo ? Number(dados.tipo) : 1,
			});
		}
	}

	const isLoading = criarMutation.isPending || atualizarMutation.isPending;

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<FieldGroup>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Controller
						control={control}
						name="codigo"
						render={({ field }) => (
							<Field data-invalid={!!errors.codigo}>
								<FieldLabel htmlFor="codigo">Código</FieldLabel>
								<Input
									id="codigo"
									placeholder="Ex: 01"
									maxLength={5}
									aria-invalid={!!errors.codigo}
									{...field}
									value={field.value ?? ""}
								/>
								<FieldError errors={errors.codigo ? [errors.codigo] : []} />
							</Field>
						)}
					/>

					<Controller
						control={control}
						name="descricao"
						render={({ field }) => (
							<Field className="md:col-span-2" data-invalid={!!errors.descricao}>
								<FieldLabel htmlFor="descricao">Descrição *</FieldLabel>
								<Input
									id="descricao"
									placeholder="Ex: Estoque Principal, Depósito, Loja..."
									maxLength={50}
									aria-invalid={!!errors.descricao}
									{...field}
									value={field.value ?? ""}
								/>
								<FieldError
									errors={errors.descricao ? [errors.descricao] : []}
								/>
							</Field>
						)}
					/>

					<Controller
						control={control}
						name="posse"
						render={({ field }) => (
							<Field data-invalid={!!errors.posse}>
								<FieldLabel>Posse</FieldLabel>
								<Select
									onValueChange={(value) => field.onChange(value)}
									value={field.value ?? "P"}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="P">Próprio</SelectItem>
										<SelectItem value="T">De terceiros</SelectItem>
										<SelectItem value="E">Em terceiros</SelectItem>
									</SelectContent>
								</Select>
								<FieldError errors={errors.posse ? [errors.posse] : []} />
							</Field>
						)}
					/>

					<Controller
						control={control}
						name="inativo"
						render={({ field }) => (
							<Field data-invalid={!!errors.inativo}>
								<FieldLabel>Situação</FieldLabel>
								<Select
									onValueChange={(value) => field.onChange(Number(value))}
									value={String(field.value ?? 0)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="0">Ativo</SelectItem>
										<SelectItem value="1">Inativo</SelectItem>
									</SelectContent>
								</Select>
								<FieldError errors={errors.inativo ? [errors.inativo] : []} />
							</Field>
						)}
					/>

					<Controller
						control={control}
						name="padrao"
						render={({ field }) => (
							<div className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 md:col-span-3">
								<Checkbox
									id="padrao"
									checked={field.value === 1}
									onCheckedChange={(checked) =>
										field.onChange(checked ? 1 : 0)
									}
								/>
								<div className="space-y-1 leading-none">
									<FieldLabel htmlFor="padrao">
										Definir como local de estoque padrão
									</FieldLabel>
									<FieldDescription>
										Será utilizado automaticamente como padrão no cadastro de
										produtos, notas fiscais de compra e movimentações de estoque
										da empresa.
									</FieldDescription>
								</div>
							</div>
						)}
					/>
				</div>

				<div className="flex gap-2">
					<Button type="submit" disabled={isLoading}>
						{isLoading ? "Salvando..." : "Salvar"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/locais-estoque")}
					>
						Cancelar
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
