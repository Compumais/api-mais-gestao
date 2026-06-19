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
import { Checkbox } from "@/components/ui/checkbox";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import { z } from "zod";
import {
	condicaoPagamentoFormSchema,
	ESCOPO_CONDICAO_PAGAMENTO,
	ESCOPO_CONDICAO_PAGAMENTO_OPCOES,
	type CondicaoPagamentoFormData,
} from "@/schemas/condicao-pagamento.schema";
import { condicaoPagamentoService } from "@/services/condicao-pagamento.service";

const ROTA_LISTAGEM = "/meios-pagamento";

type MeioPagamentoFormProps = {
	modo?: "criar" | "editar";
	condicaoPagamentoId?: string;
	valoresIniciais?: Partial<CondicaoPagamentoFormData>;
};

export function MeioPagamentoForm(props: MeioPagamentoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<
		z.input<typeof condicaoPagamentoFormSchema>,
		unknown,
		CondicaoPagamentoFormData
	>({
		resolver: zodResolver(condicaoPagamentoFormSchema),
		defaultValues: {
			codigo: "",
			descricao: "",
			parcelas: 1,
			prazos: "0",
			escopo: ESCOPO_CONDICAO_PAGAMENTO.COMPRA_E_VENDA,
			inativo: false,
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
		fetchFn: condicaoPagamentoService.buscarProximoCodigo,
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

	const { mutate: criar, isPending: isPendingCriar } = useMutation({
		mutationFn: condicaoPagamentoService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meios-pagamento"] });
			toast.success("Meio de pagamento cadastrado com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar meio de pagamento");
		},
	});

	const { mutate: atualizar, isPending: isPendingAtualizar } = useMutation({
		mutationFn: async (
			dados: Parameters<typeof condicaoPagamentoService.atualizar>[1],
		) => {
			if (!isEdicao || !props.condicaoPagamentoId) {
				throw new Error("ID do meio de pagamento é obrigatório para editar");
			}
			return await condicaoPagamentoService.atualizar(
				props.condicaoPagamentoId,
				dados,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meios-pagamento"] });
			toast.success("Meio de pagamento atualizado com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar meio de pagamento");
		},
	});

	const montarPayload = (data: CondicaoPagamentoFormData) => ({
		codigo: data.codigo || null,
		descricao: data.descricao,
		parcelas: data.parcelas,
		prazos: data.prazos || null,
		escopo: data.escopo,
		inativo: data.inativo ? 1 : 0,
	});

	const onSubmit = (data: CondicaoPagamentoFormData) => {
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
					<h2 className="text-lg font-semibold">Dados do meio de pagamento</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código</FieldLabel>
							<Input
								id="codigo"
								placeholder="Ex: 1"
								aria-invalid={!!errors.codigo}
								{...register("codigo")}
							/>
							<p className="text-sm text-muted-foreground">
								Preenchido automaticamente; pode ser alterado.
							</p>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.descricao}>
							<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
							<Input
								id="descricao"
								placeholder="Ex: À vista"
								aria-invalid={!!errors.descricao}
								{...register("descricao")}
							/>
							<FieldError errors={errors.descricao ? [errors.descricao] : []} />
						</Field>

						<Field data-invalid={!!errors.parcelas}>
							<FieldLabel htmlFor="parcelas">Parcelas</FieldLabel>
							<Input
								id="parcelas"
								type="number"
								min={1}
								aria-invalid={!!errors.parcelas}
								{...register("parcelas")}
							/>
							<FieldError errors={errors.parcelas ? [errors.parcelas] : []} />
						</Field>

						<Field data-invalid={!!errors.prazos}>
							<FieldLabel htmlFor="prazos">Prazos (dias)</FieldLabel>
							<Input
								id="prazos"
								placeholder="Ex: 0 ou 30,60,90"
								aria-invalid={!!errors.prazos}
								{...register("prazos")}
							/>
							<p className="text-sm text-muted-foreground">
								Separe os prazos por vírgula. Use 0 para pagamento à vista.
							</p>
							<FieldError errors={errors.prazos ? [errors.prazos] : []} />
						</Field>

						<Field data-invalid={!!errors.escopo}>
							<FieldLabel htmlFor="escopo">Escopo</FieldLabel>
							<Controller
								control={control}
								name="escopo"
								render={({ field }) => (
									<Select
										value={String(field.value)}
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="escopo" aria-invalid={!!errors.escopo}>
											<SelectValue placeholder="Selecione o escopo" />
										</SelectTrigger>
										<SelectContent>
											{ESCOPO_CONDICAO_PAGAMENTO_OPCOES.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							<FieldError errors={errors.escopo ? [errors.escopo] : []} />
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
						{isEdicao
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
