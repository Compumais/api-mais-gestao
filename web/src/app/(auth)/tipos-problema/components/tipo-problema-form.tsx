"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type TipoProblemaFormData,
	tipoProblemaFormSchema,
} from "@/schemas/tipo-problema.schema";
import { tipoProblemaService } from "@/services/tipo-problema.service";

const ROTA_LISTAGEM = "/tipos-problema";

type TipoProblemaFormProps = {
	modo?: "criar" | "editar";
	tipoProblemaId?: string;
	valoresIniciais?: Partial<TipoProblemaFormData>;
};

export function TipoProblemaForm(props: TipoProblemaFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<
		z.input<typeof tipoProblemaFormSchema>,
		unknown,
		TipoProblemaFormData
	>({
		resolver: zodResolver(tipoProblemaFormSchema),
		defaultValues: {
			codigo: "",
			descricao: "",
			inativo: false,
		},
	});

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = form;

	useEffect(() => {
		if (!isEdicao) return;
		if (!props.valoresIniciais) return;
		form.reset({
			...form.getValues(),
			...props.valoresIniciais,
		});
	}, [isEdicao, props.valoresIniciais, form]);

	const { mutate: criar, isPending: isPendingCriar } = useMutation({
		mutationFn: tipoProblemaService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tipos-problema"] });
			queryClient.invalidateQueries({ queryKey: ["tipos-problema-os-form"] });
			queryClient.invalidateQueries({
				queryKey: ["tipos-problema-os-detalhe"],
			});
			toast.success("Tipo de problema cadastrado com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar tipo de problema");
		},
	});

	const { mutate: atualizar, isPending: isPendingAtualizar } = useMutation({
		mutationFn: async (
			dados: Parameters<typeof tipoProblemaService.atualizar>[1],
		) => {
			if (!isEdicao || !props.tipoProblemaId) {
				throw new Error("ID do tipo de problema é obrigatório para editar");
			}
			return await tipoProblemaService.atualizar(props.tipoProblemaId, dados);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tipos-problema"] });
			queryClient.invalidateQueries({ queryKey: ["tipos-problema-os-form"] });
			queryClient.invalidateQueries({
				queryKey: ["tipos-problema-os-detalhe"],
			});
			toast.success("Tipo de problema atualizado com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar tipo de problema");
		},
	});

	const montarPayload = (data: TipoProblemaFormData) => ({
		codigo: data.codigo || null,
		descricao: data.descricao,
		inativo: data.inativo ? 1 : 0,
	});

	const onSubmit = (data: TipoProblemaFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		const payload = montarPayload(data);

		if (!isEdicao) {
			criar({
				idempresa: empresa.id,
				...payload,
			});
			return;
		}

		atualizar(payload);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados do tipo de problema</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código</FieldLabel>
							<Input
								id="codigo"
								placeholder="Ex: 1"
								maxLength={6}
								aria-invalid={!!errors.codigo}
								{...register("codigo")}
							/>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.descricao}>
							<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
							<Input
								id="descricao"
								placeholder="Ex: Manutenção preventiva"
								maxLength={50}
								aria-invalid={!!errors.descricao}
								{...register("descricao")}
							/>
							<FieldError
								errors={errors.descricao ? [errors.descricao] : []}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="inativo">Inativo</FieldLabel>
							<Controller
								control={control}
								name="inativo"
								render={({ field }) => (
									<div className="flex items-center gap-3 rounded-lg border p-4">
										<Checkbox
											id="inativo"
											checked={field.value}
											onCheckedChange={(checked) =>
												field.onChange(checked === true)
											}
											aria-label="Marcar como inativo"
										/>
										<span className="text-sm text-muted-foreground">
											{field.value ? "Inativo" : "Ativo"}
										</span>
									</div>
								)}
							/>
						</Field>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Cancelar
					</Button>
					<Button type="submit" disabled={isPendingCriar || isPendingAtualizar}>
						{isPendingCriar || isPendingAtualizar
							? "Salvando..."
							: isEdicao
								? "Salvar alterações"
								: "Cadastrar"}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
