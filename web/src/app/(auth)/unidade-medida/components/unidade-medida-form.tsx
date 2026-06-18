"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import {
	type UnidadeMedidaFormData,
	unidadeMedidaFormSchema,
} from "@/schemas/unidade-medida.schema";
import { unidadeMedidaService } from "@/services/unidade-medida.service";

type UnidadeMedidaFormProps = {
	modo?: "criar" | "editar";
	unidadeMedidaId?: string;
	valoresIniciais?: Partial<UnidadeMedidaFormData>;
};

export function UnidadeMedidaForm(props: UnidadeMedidaFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<UnidadeMedidaFormData>({
		resolver: zodResolver(unidadeMedidaFormSchema),
		defaultValues: {
			nome: "",
			codigo: "",
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
		fetchFn: unidadeMedidaService.buscarProximoCodigo,
		setValue,
		valorCodigoAtual: codigo,
	});

	useEffect(() => {
		if (!isEdicao) return;
		if (!props.valoresIniciais) return;
		form.reset({
			...form.getValues(),
			...props.valoresIniciais,
		});
	}, [isEdicao, props.valoresIniciais, form]);

	const { mutate: criarUnidadeMedida, isPending: isPendingCriar } = useMutation(
		{
			mutationFn: unidadeMedidaService.criar,
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["unidades-medida"] });
				toast.success("Unidade de medida cadastrada com sucesso!");
				router.push("/unidade-medida");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao cadastrar unidade de medida");
			},
		},
	);

	const { mutate: atualizarUnidadeMedida, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async (
				dados: Parameters<typeof unidadeMedidaService.atualizar>[1],
			) => {
				if (!isEdicao || !props.unidadeMedidaId) {
					throw new Error("ID da unidade de medida é obrigatório para editar");
				}
				return await unidadeMedidaService.atualizar(
					props.unidadeMedidaId,
					dados,
				);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["unidades-medida"] });
				toast.success("Unidade de medida atualizada com sucesso!");
				router.push("/unidade-medida");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar unidade de medida");
			},
		});

	const onSubmit = (data: UnidadeMedidaFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			criarUnidadeMedida({
				idempresa: empresa.id,
				nome: data.nome || null,
				codigo: data.codigo || null,
			});
			return;
		}

		const payloadAtualizacao = {
			nome: data.nome || null,
			codigo: data.codigo || null,
		} satisfies Parameters<typeof unidadeMedidaService.atualizar>[1];

		atualizarUnidadeMedida(payloadAtualizacao);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados da Unidade de Medida</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código</FieldLabel>
							<Input
								id="codigo"
								placeholder="Ex: UN"
								aria-invalid={!!errors.codigo}
								aria-describedby={
									errors.codigo ? "codigo-error" : undefined
								}
								{...register("codigo")}
							/>
							<p className="text-sm text-muted-foreground">
								Preenchido automaticamente; pode ser alterado.
							</p>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.nome}>
							<FieldLabel htmlFor="nome">Nome</FieldLabel>
							<Input
								id="nome"
								placeholder="Ex: Unidade"
								aria-invalid={!!errors.nome}
								aria-describedby={errors.nome ? "nome-error" : undefined}
								{...register("nome")}
							/>
							<FieldError errors={errors.nome ? [errors.nome] : []} />
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
