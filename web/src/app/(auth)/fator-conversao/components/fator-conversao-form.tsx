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
import {
	type FatorConversaoFormData,
	fatorConversaoFormSchema,
} from "@/schemas/fator-conversao.schema";
import { fatorConversaoService } from "@/services/fator-conversao.service";

type FatorConversaoFormProps = {
	modo?: "criar" | "editar";
	fatorConversaoId?: string;
	valoresIniciais?: Partial<FatorConversaoFormData>;
};

export function FatorConversaoForm(props: FatorConversaoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<FatorConversaoFormData>({
		resolver: zodResolver(fatorConversaoFormSchema),
		defaultValues: {
			nome: "",
			fator: "1",
		},
	});

	const {
		register,
		handleSubmit,
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

	const { mutate: criarFator, isPending: isPendingCriar } = useMutation({
		mutationFn: fatorConversaoService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fatores-conversao"] });
			toast.success("Fator de conversão cadastrado com sucesso!");
			router.push("/fator-conversao");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar fator de conversão");
		},
	});

	const { mutate: atualizarFator, isPending: isPendingAtualizar } = useMutation({
		mutationFn: async (
			dados: Parameters<typeof fatorConversaoService.atualizar>[1],
		) => {
			if (!isEdicao || !props.fatorConversaoId) {
				throw new Error("ID do fator de conversão é obrigatório para editar");
			}
			return await fatorConversaoService.atualizar(props.fatorConversaoId, dados);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fatores-conversao"] });
			toast.success("Fator de conversão atualizado com sucesso!");
			router.push("/fator-conversao");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar fator de conversão");
		},
	});

	const onSubmit = (data: FatorConversaoFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		const fatorNormalizado = data.fator.replace(",", ".");

		if (!isEdicao) {
			criarFator({
				idempresa: empresa.id,
				nome: data.nome.trim(),
				fator: fatorNormalizado,
			});
			return;
		}

		atualizarFator({
			nome: data.nome.trim(),
			fator: fatorNormalizado,
		});
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados do Fator de Conversão</h2>
					<p className="text-sm text-muted-foreground">
						Ex.: &quot;Caixa 10 unidades&quot; com fator 10 converte o preço da
						nota para a unidade de estoque (preço NF ÷ fator).
					</p>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Field data-invalid={!!errors.nome}>
							<FieldLabel htmlFor="nome">Nome</FieldLabel>
							<Input
								id="nome"
								placeholder="Ex: Caixa 10 unidades"
								aria-invalid={!!errors.nome}
								{...register("nome")}
							/>
							<FieldError errors={errors.nome ? [errors.nome] : []} />
						</Field>

						<Field data-invalid={!!errors.fator}>
							<FieldLabel htmlFor="fator">Fator</FieldLabel>
							<Input
								id="fator"
								type="text"
								inputMode="decimal"
								placeholder="Ex: 10"
								aria-invalid={!!errors.fator}
								{...register("fator")}
							/>
							<p className="text-sm text-muted-foreground">
								Quantidade de unidades de estoque por unidade da nota.
							</p>
							<FieldError errors={errors.fator ? [errors.fator] : []} />
						</Field>
					</div>
				</div>

				<div className="mt-6 flex justify-end gap-2">
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
