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
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import {
	type TipoContratoFormData,
	tipoContratoFormSchema,
} from "@/schemas/tipo-contrato.schema";
import { grupoContratoService } from "@/services/grupo-contrato.service";
import { tipoContratoService } from "@/services/tipo-contrato.service";

const ROTA_LISTAGEM = "/tipos-contrato";

type TipoContratoFormProps = {
	modo?: "criar" | "editar";
	tipoContratoId?: string;
	valoresIniciais?: Partial<TipoContratoFormData>;
};

function codigoEstaVazio(valor: unknown): boolean {
	if (valor == null) return true;
	if (typeof valor === "string") return valor.trim() === "";
	if (typeof valor === "number") return Number.isNaN(valor);
	return false;
}

export function TipoContratoForm(props: TipoContratoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<
		z.input<typeof tipoContratoFormSchema>,
		unknown,
		TipoContratoFormData
	>({
		resolver: zodResolver(tipoContratoFormSchema),
		defaultValues: {
			idgrupocontrato: "",
			codigo: undefined,
			descricao: "",
			valor: undefined,
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		control,
		formState: { errors },
	} = form;

	const codigo = watch("codigo");

	useProximoCodigo({
		idempresa: empresa?.id,
		enabled: !isEdicao,
		fetchFn: tipoContratoService.buscarProximoCodigo,
		setValue,
		valorCodigoAtual: codigo,
	});

	const { data: grupos = [], isLoading: carregandoGrupos } = useQuery({
		queryKey: ["grupos-contrato", empresa?.id, "form"],
		enabled: Boolean(empresa?.id),
		queryFn: () => grupoContratoService.listarTodos({ idempresa: empresa!.id }),
	});

	const opcoesGrupos = useMemo(
		() =>
			grupos.map((g) => ({
				value: g.id,
				label: `${g.codigo} - ${g.descricao}`,
			})),
		[grupos],
	);

	useEffect(() => {
		if (!isEdicao || !props.valoresIniciais) return;
		form.reset({
			...form.getValues(),
			...props.valoresIniciais,
		});
	}, [isEdicao, props.valoresIniciais, form]);

	const { mutate: criar, isPending: isPendingCriar } = useMutation({
		mutationFn: tipoContratoService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tipos-contrato"] });
			toast.success("Tipo de contrato cadastrado com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar tipo de contrato");
		},
	});

	const { mutate: atualizar, isPending: isPendingAtualizar } = useMutation({
		mutationFn: async (
			dados: Parameters<typeof tipoContratoService.atualizar>[1],
		) => {
			if (!isEdicao || !props.tipoContratoId) {
				throw new Error("ID do tipo de contrato é obrigatório para editar");
			}
			return await tipoContratoService.atualizar(props.tipoContratoId, dados);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tipos-contrato"] });
			toast.success("Tipo de contrato atualizado com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar tipo de contrato");
		},
	});

	const onSubmit = (data: TipoContratoFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			criar({
				idempresa: empresa.id,
				idgrupocontrato: data.idgrupocontrato,
				codigo: data.codigo,
				descricao: data.descricao,
				valor: data.valor,
			});
			return;
		}

		atualizar({
			idgrupocontrato: data.idgrupocontrato,
			codigo: data.codigo,
			descricao: data.descricao,
			valor: data.valor,
		});
	};

	const { onBlur: onBlurCodigo, ...codigoRegister } = register("codigo");

	const preencherCodigoSeVazio = async () => {
		if (isEdicao || !empresa?.id) return;
		if (!codigoEstaVazio(form.getValues("codigo"))) return;
		try {
			const { codigo: proximo } =
				await tipoContratoService.buscarProximoCodigo(empresa.id);
			setValue("codigo", proximo, { shouldValidate: true });
		} catch {
			// mantém vazio; validação do formulário cobre
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados do tipo de contrato</h2>
					<p className="text-sm text-muted-foreground">
						O valor cadastrado aqui é apenas uma sugestão ao criar contratos.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field
							className="md:col-span-2"
							data-invalid={!!errors.idgrupocontrato}
						>
							<FieldLabel>Grupo de contrato</FieldLabel>
							<Controller
								control={control}
								name="idgrupocontrato"
								render={({ field }) => (
									<Combobox
										options={opcoesGrupos}
										value={field.value}
										onChange={field.onChange}
										placeholder={
											carregandoGrupos
												? "Carregando grupos..."
												: "Selecione o grupo"
										}
										searchPlaceholder="Buscar grupo..."
										emptyMessage="Cadastre um grupo de contrato primeiro."
										disabled={carregandoGrupos}
									/>
								)}
							/>
							<FieldError
								errors={
									errors.idgrupocontrato ? [errors.idgrupocontrato] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código</FieldLabel>
							<Input
								id="codigo"
								type="number"
								placeholder="Ex: 1"
								aria-invalid={!!errors.codigo}
								{...codigoRegister}
								onBlur={async (e) => {
									onBlurCodigo(e);
									await preencherCodigoSeVazio();
								}}
							/>
							<p className="text-sm text-muted-foreground">
								Se vazio, preenche com o próximo código ao sair do campo.
							</p>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.valor}>
							<FieldLabel htmlFor="valor">Valor sugerido</FieldLabel>
							<Input
								id="valor"
								type="number"
								step="0.01"
								placeholder="Ex: 150.00"
								aria-invalid={!!errors.valor}
								{...register("valor")}
							/>
							<FieldError errors={errors.valor ? [errors.valor] : []} />
						</Field>

						<Field className="md:col-span-2" data-invalid={!!errors.descricao}>
							<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
							<Input
								id="descricao"
								placeholder="Ex: Mensalidade padrão"
								maxLength={120}
								aria-invalid={!!errors.descricao}
								{...register("descricao")}
							/>
							<FieldError errors={errors.descricao ? [errors.descricao] : []} />
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
