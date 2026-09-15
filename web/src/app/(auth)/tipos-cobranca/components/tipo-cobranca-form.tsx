"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type TipoCobrancaFormData,
	tipoCobrancaFormSchema,
} from "@/schemas/tipo-cobranca.schema";
import { tipoCobrancaService } from "@/services/tipo-cobranca.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";

const ROTA_LISTAGEM = "/tipos-cobranca";

type TipoCobrancaFormProps = {
	modo?: "criar" | "editar";
	tipoCobrancaId?: string;
	valoresIniciais?: Partial<TipoCobrancaFormData>;
};

export function TipoCobrancaForm(props: TipoCobrancaFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<
		z.input<typeof tipoCobrancaFormSchema>,
		unknown,
		TipoCobrancaFormData
	>({
		resolver: zodResolver(tipoCobrancaFormSchema),
		defaultValues: {
			codigo: undefined,
			descricao: "",
			idtipodocumentofinanceiro: "",
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

	const { data: tiposDocumento = [] } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id, "form-tipo-cobranca"],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	const opcoesTipoDocumento = useMemo(
		() =>
			tiposDocumento.map((tipo) => ({
				value: tipo.id,
				label: tipo.descricao,
			})),
		[tiposDocumento],
	);

	const { mutate: criar, isPending: isPendingCriar } = useMutation({
		mutationFn: tipoCobrancaService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tipos-cobranca"] });
			toast.success("Tipo de cobrança cadastrado com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar tipo de cobrança");
		},
	});

	const { mutate: atualizar, isPending: isPendingAtualizar } = useMutation({
		mutationFn: async (
			dados: Parameters<typeof tipoCobrancaService.atualizar>[1],
		) => {
			if (!isEdicao || !props.tipoCobrancaId) {
				throw new Error("ID do tipo de cobrança é obrigatório para editar");
			}
			return await tipoCobrancaService.atualizar(props.tipoCobrancaId, dados);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tipos-cobranca"] });
			toast.success("Tipo de cobrança atualizado com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar tipo de cobrança");
		},
	});

	const onSubmit = (data: TipoCobrancaFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			criar({
				idempresa: empresa.id,
				codigo: data.codigo,
				descricao: data.descricao,
				idtipodocumentofinanceiro: data.idtipodocumentofinanceiro,
			});
			return;
		}

		atualizar({
			codigo: data.codigo,
			descricao: data.descricao,
			idtipodocumentofinanceiro: data.idtipodocumentofinanceiro,
		});
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados do tipo de cobrança</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código</FieldLabel>
							<Input
								id="codigo"
								type="number"
								placeholder="Ex: 1"
								aria-invalid={!!errors.codigo}
								{...register("codigo")}
							/>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.descricao}>
							<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
							<Input
								id="descricao"
								placeholder="Ex: Boleto bancário"
								maxLength={120}
								aria-invalid={!!errors.descricao}
								{...register("descricao")}
							/>
							<FieldError errors={errors.descricao ? [errors.descricao] : []} />
						</Field>

						<Field
							className="md:col-span-2"
							data-invalid={!!errors.idtipodocumentofinanceiro}
						>
							<FieldLabel htmlFor="idtipodocumentofinanceiro">
								Tipo de documento financeiro
							</FieldLabel>
							<Controller
								control={control}
								name="idtipodocumentofinanceiro"
								render={({ field }) => (
									<Combobox
										options={opcoesTipoDocumento}
										value={field.value}
										onChange={field.onChange}
										placeholder="Selecione o tipo de documento"
										searchPlaceholder="Buscar tipo de documento..."
										emptyMessage="Nenhum tipo de documento encontrado."
										disabled={!empresa}
									/>
								)}
							/>
							<FieldError
								errors={
									errors.idtipodocumentofinanceiro
										? [errors.idtipodocumentofinanceiro]
										: []
								}
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
