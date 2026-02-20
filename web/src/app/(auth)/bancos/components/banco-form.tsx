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
	type AtualizarBancoFormData,
	atualizarBancoSchema,
	type CriarBancoFormData,
	criarBancoSchema,
} from "@/schemas/bancos.schema";
import { bancosService } from "@/services/bancos.service";

type BancoFormProps = {
	modo?: "criar" | "editar";
	bancoId?: string;
	valoresIniciais?: Partial<CriarBancoFormData | AtualizarBancoFormData>;
};

export function BancoForm(props: BancoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<CriarBancoFormData | AtualizarBancoFormData>({
		resolver: zodResolver(isEdicao ? atualizarBancoSchema : criarBancoSchema),
		defaultValues: isEdicao
			? {}
			: {
				idempresa: empresa?.id || "",
				codigo: "",
				nome: "",
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

	const { mutate: criarBanco, isPending: isPendingCriar } = useMutation({
		mutationFn: bancosService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bancos"] });
			toast.success("Banco cadastrado com sucesso!");
			router.push("/bancos");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar banco");
		},
	});

	const { mutate: atualizarBanco, isPending: isPendingAtualizar } = useMutation(
		{
			mutationFn: async (dados: AtualizarBancoFormData) => {
				if (!isEdicao || !props.bancoId) {
					throw new Error("ID do banco é obrigatório para editar");
				}
				return await bancosService.atualizar(props.bancoId, dados);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["bancos"] });
				toast.success("Banco atualizado com sucesso!");
				router.push("/bancos");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar banco");
			},
		},
	);

	const onSubmit = (data: CriarBancoFormData | AtualizarBancoFormData) => {
		if (!empresa && !isEdicao) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (!isEdicao) {
			const payload = {
				idempresa: empresa!.id,
				codigo: (data as CriarBancoFormData).codigo,
				nome: (data as CriarBancoFormData).nome,
			};

			criarBanco(payload);
			return;
		}

		const payloadAtualizacao = data as AtualizarBancoFormData;
		atualizarBanco(payloadAtualizacao);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados do Banco</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código *</FieldLabel>
							<Input
								id="codigo"
								placeholder="Código do banco"
								aria-invalid={!!errors.codigo}
								aria-describedby={errors.codigo ? "codigo-error" : undefined}
								{...register("codigo")}
							/>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.nome}>
							<FieldLabel htmlFor="nome">Nome *</FieldLabel>
							<Input
								id="nome"
								placeholder="Nome do banco"
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
