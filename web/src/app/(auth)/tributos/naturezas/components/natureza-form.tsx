"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import {
	OPCOES_TIPO_PRODUTO,
	sugerirTipoprodutoPorCodigoCfop,
} from "@/constants/tipo-produto";
import { useEmpresa } from "@/hooks/use-empresa";
import { type CfopFormData, cfopFormSchema } from "@/schemas/cfop.schema";
import { cfopService } from "@/services/cfop.service";

const ROTA_LISTAGEM = "/tributos/naturezas";

type NaturezaFormProps = {
	modo?: "criar" | "editar";
	naturezaId?: string;
	valoresIniciais?: Partial<CfopFormData>;
};

export function NaturezaForm(props: NaturezaFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<CfopFormData>({
		resolver: zodResolver(cfopFormSchema),
		defaultValues: {
			codigo: "",
			descricao: "",
			tipoproduto: null,
		},
	});

	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const codigo = watch("codigo");

	useEffect(() => {
		if (!isEdicao) return;
		if (!props.valoresIniciais) return;
		form.reset({
			...form.getValues(),
			...props.valoresIniciais,
		});
	}, [isEdicao, props.valoresIniciais, form]);

	useEffect(() => {
		if (isEdicao) return;
		const sugerido = sugerirTipoprodutoPorCodigoCfop(codigo);
		if (sugerido) {
			setValue("tipoproduto", sugerido, { shouldValidate: true });
		}
	}, [codigo, isEdicao, setValue]);

	const { mutate: criarNatureza, isPending: isPendingCriar } = useMutation({
		mutationFn: cfopService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cfops"] });
			toast.success("Natureza cadastrada com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar natureza");
		},
	});

	const { mutate: atualizarNatureza, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async (
				dados: Parameters<typeof cfopService.atualizar>[1],
			) => {
				if (!isEdicao || !props.naturezaId) {
					throw new Error("ID da natureza é obrigatório para editar");
				}
				return await cfopService.atualizar(props.naturezaId, dados);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["cfops"] });
				toast.success("Natureza atualizada com sucesso!");
				router.push(ROTA_LISTAGEM);
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar natureza");
			},
		});

	const onSubmit = (data: CfopFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			criarNatureza({
				idempresa: empresa.id,
				codigo: data.codigo,
				descricao: data.descricao,
				tipoproduto: data.tipoproduto ?? null,
			});
			return;
		}

		atualizarNatureza({
			codigo: data.codigo,
			descricao: data.descricao,
			tipoproduto: data.tipoproduto ?? null,
		});
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field data-invalid={!!errors.codigo}>
						<FieldLabel htmlFor="codigo">Código CFOP</FieldLabel>
						<Input
							id="codigo"
							placeholder="Ex: 1101"
							maxLength={20}
							aria-invalid={!!errors.codigo}
							aria-describedby={errors.codigo ? "codigo-error" : undefined}
							{...register("codigo")}
						/>
						<p className="text-sm text-muted-foreground">
							1, 2 ou 3 = entrada · 5, 6 ou 7 = saída
						</p>
						<FieldError errors={errors.codigo ? [errors.codigo] : []} />
					</Field>

					<Field data-invalid={!!errors.tipoproduto}>
						<FieldLabel htmlFor="tipoproduto">Tipo de produto (SPED)</FieldLabel>
						<Controller
							name="tipoproduto"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value ?? "none"}
									onValueChange={(valor) =>
										field.onChange(valor === "none" ? null : valor)
									}
								>
									<SelectTrigger id="tipoproduto" className="w-full">
										<SelectValue placeholder="Selecione o tipo" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Não informado</SelectItem>
										{OPCOES_TIPO_PRODUTO.map((opcao) => (
											<SelectItem key={opcao.value} value={opcao.value}>
												{opcao.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						<p className="text-sm text-muted-foreground">
							Define o tipoproduto sugerido nos produtos com este CFOP de
							entrada
						</p>
						<FieldError
							errors={errors.tipoproduto ? [errors.tipoproduto] : []}
						/>
					</Field>

					<Field data-invalid={!!errors.descricao} className="md:col-span-2">
						<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
						<Input
							id="descricao"
							placeholder="Descrição da natureza de operação"
							maxLength={1024}
							aria-invalid={!!errors.descricao}
							aria-describedby={
								errors.descricao ? "descricao-error" : undefined
							}
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
