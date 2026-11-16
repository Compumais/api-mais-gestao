"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import {
	type GrupoContratoFormData,
	grupoContratoFormSchema,
} from "@/schemas/grupo-contrato.schema";
import { grupoContratoService } from "@/services/grupo-contrato.service";

const ROTA_LISTAGEM = "/grupos-contrato";

type Props = {
	modo?: "criar" | "editar";
	grupoContratoId?: string;
	valoresIniciais?: Partial<GrupoContratoFormData>;
};

function codigoEstaVazio(valor: unknown): boolean {
	if (valor == null) return true;
	if (typeof valor === "string") return valor.trim() === "";
	if (typeof valor === "number") return Number.isNaN(valor);
	return false;
}

export function GrupoContratoForm(props: Props) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<
		z.input<typeof grupoContratoFormSchema>,
		unknown,
		GrupoContratoFormData
	>({
		resolver: zodResolver(grupoContratoFormSchema),
		defaultValues: {
			codigo: undefined,
			descricao: "",
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const codigo = watch("codigo");

	useProximoCodigo({
		idempresa: empresa?.id,
		enabled: !isEdicao,
		fetchFn: grupoContratoService.buscarProximoCodigo,
		setValue,
		valorCodigoAtual: codigo,
	});

	useEffect(() => {
		if (!isEdicao || !props.valoresIniciais) return;
		form.reset({
			...form.getValues(),
			...props.valoresIniciais,
		});
	}, [isEdicao, props.valoresIniciais, form]);

	const { mutate: criar, isPending: isPendingCriar } = useMutation({
		mutationFn: grupoContratoService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["grupos-contrato"] });
			toast.success("Grupo de contrato cadastrado");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar grupo");
		},
	});

	const { mutate: atualizar, isPending: isPendingAtualizar } = useMutation({
		mutationFn: async (
			dados: Parameters<typeof grupoContratoService.atualizar>[1],
		) => {
			if (!props.grupoContratoId) throw new Error("ID obrigatório");
			return grupoContratoService.atualizar(props.grupoContratoId, dados);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["grupos-contrato"] });
			toast.success("Grupo de contrato atualizado");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar grupo");
		},
	});

	const { onBlur: onBlurCodigo, ...codigoRegister } = register("codigo");

	const onSubmit = (data: GrupoContratoFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}
		if (!isEdicao) {
			criar({
				idempresa: empresa.id,
				codigo: data.codigo,
				descricao: data.descricao,
			});
			return;
		}
		atualizar({
			codigo: data.codigo,
			descricao: data.descricao,
		});
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field data-invalid={!!errors.codigo}>
						<FieldLabel htmlFor="codigo">Código</FieldLabel>
						<Input
							id="codigo"
							type="number"
							aria-invalid={!!errors.codigo}
							{...codigoRegister}
							onBlur={async (e) => {
								onBlurCodigo(e);
								if (isEdicao || !empresa?.id) return;
								if (!codigoEstaVazio(form.getValues("codigo"))) return;
								try {
									const { codigo: proximo } =
										await grupoContratoService.buscarProximoCodigo(empresa.id);
									setValue("codigo", proximo, { shouldValidate: true });
								} catch {
									// validação cobre
								}
							}}
						/>
						<p className="text-sm text-muted-foreground">
							Se vazio, preenche com o próximo código ao sair do campo.
						</p>
						<FieldError errors={errors.codigo ? [errors.codigo] : []} />
					</Field>
					<Field data-invalid={!!errors.descricao}>
						<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
						<Input
							id="descricao"
							maxLength={120}
							aria-invalid={!!errors.descricao}
							{...register("descricao")}
						/>
						<FieldError errors={errors.descricao ? [errors.descricao] : []} />
					</Field>
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
