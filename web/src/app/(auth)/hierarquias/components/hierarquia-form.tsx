"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type HierarquiaFormData,
	hierarquiaFormSchema,
} from "@/schemas/hierarquia.schema";
import { hierarquiasService } from "@/services/hierarquias.service";

const CLASSE_OPCOES = [
	{ value: "0", label: "Revenda" },
	{ value: "1", label: "Matéria-prima" },
	{ value: "2", label: "Mat. embalagem" },
	{ value: "3", label: "Consumo interno" },
] as const;

const ORIGEM_OPCOES = [
	{ value: "0", label: "Nacional" },
	{ value: "1", label: "Importação direta" },
	{ value: "2", label: "Adquirida no mercado interno" },
] as const;

type HierarquiaFormProps = {
	modo?: "criar" | "editar";
	hierarquiaId?: string;
	valoresIniciais?: Partial<HierarquiaFormData>;
};

function parseComissao(valor?: string): number | null {
	if (!valor || valor.trim() === "") return null;
	const numero = Number.parseFloat(valor.replace(",", "."));
	return Number.isNaN(numero) ? null : numero;
}

function parseSelectNumber(valor?: string): number | null {
	if (!valor) return null;
	const numero = Number.parseInt(valor, 10);
	return Number.isNaN(numero) ? null : numero;
}

export function HierarquiaForm(props: HierarquiaFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<HierarquiaFormData>({
		resolver: zodResolver(hierarquiaFormSchema),
		defaultValues: {
			codigo: "",
			nome: "",
			ncm: "",
			classe: undefined,
			origem: undefined,
			comissao: "",
			enviamobile: false,
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const classe = watch("classe");
	const origem = watch("origem");
	const enviamobile = watch("enviamobile");

	useEffect(() => {
		if (!isEdicao) return;
		if (!props.valoresIniciais) return;
		form.reset({
			...form.getValues(),
			...props.valoresIniciais,
		});
	}, [isEdicao, props.valoresIniciais, form]);

	const { mutate: criarHierarquia, isPending: isPendingCriar } = useMutation({
		mutationFn: hierarquiasService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["hierarquias"] });
			toast.success("Hierarquia cadastrada com sucesso!");
			router.push("/hierarquias");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar hierarquia");
		},
	});

	const { mutate: atualizarHierarquia, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async (
				dados: Parameters<typeof hierarquiasService.atualizar>[1],
			) => {
				if (!isEdicao || !props.hierarquiaId) {
					throw new Error("ID da hierarquia é obrigatório para editar");
				}
				return await hierarquiasService.atualizar(props.hierarquiaId, dados);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["hierarquias"] });
				toast.success("Hierarquia atualizada com sucesso!");
				router.push("/hierarquias");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar hierarquia");
			},
		});

	const onSubmit = (data: HierarquiaFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		const payload = {
			codigo: data.codigo?.trim() || null,
			nome: data.nome?.trim() || null,
			ncm: data.ncm?.trim() || null,
			classe: parseSelectNumber(data.classe),
			origem: parseSelectNumber(data.origem),
			comissao: parseComissao(data.comissao),
			enviamobile: data.enviamobile ? 1 : 0,
		};

		if (!isEdicao) {
			criarHierarquia({
				idempresa: empresa.id,
				...payload,
			});
			return;
		}

		atualizarHierarquia(payload);
	};

	const isPending = isPendingCriar || isPendingAtualizar;

	if (!empresa) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				Selecione uma empresa no menu superior para cadastrar hierarquias.
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados da Hierarquia</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código</FieldLabel>
							<Input
								id="codigo"
								placeholder="Código do grupo"
								aria-invalid={!!errors.codigo}
								{...register("codigo")}
							/>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.nome}>
							<FieldLabel htmlFor="nome">Nome</FieldLabel>
							<Input
								id="nome"
								placeholder="Nome do grupo"
								aria-invalid={!!errors.nome}
								{...register("nome")}
							/>
							<FieldError errors={errors.nome ? [errors.nome] : []} />
						</Field>
					</div>
				</div>

				<div className="mt-6 space-y-4">
					<h2 className="text-lg font-semibold">Dados fiscais</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Field data-invalid={!!errors.ncm}>
							<FieldLabel htmlFor="ncm">NCM</FieldLabel>
							<Input
								id="ncm"
								placeholder="Ex: 22021000"
								aria-invalid={!!errors.ncm}
								{...register("ncm")}
							/>
							<FieldError errors={errors.ncm ? [errors.ncm] : []} />
						</Field>

						<Field data-invalid={!!errors.comissao}>
							<FieldLabel htmlFor="comissao">Comissão (%)</FieldLabel>
							<Input
								id="comissao"
								type="text"
								inputMode="decimal"
								placeholder="Ex: 5,00"
								aria-invalid={!!errors.comissao}
								{...register("comissao")}
							/>
							<FieldError errors={errors.comissao ? [errors.comissao] : []} />
						</Field>

						<Field data-invalid={!!errors.classe}>
							<FieldLabel htmlFor="classe">Classe</FieldLabel>
							<Select
								value={classe}
								onValueChange={(value) =>
									setValue("classe", value as HierarquiaFormData["classe"], {
										shouldValidate: true,
									})
								}
							>
								<SelectTrigger id="classe" className="w-full">
									<SelectValue placeholder="Selecione a classe" />
								</SelectTrigger>
								<SelectContent>
									{CLASSE_OPCOES.map((opcao) => (
										<SelectItem key={opcao.value} value={opcao.value}>
											{opcao.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError errors={errors.classe ? [errors.classe] : []} />
						</Field>

						<Field data-invalid={!!errors.origem}>
							<FieldLabel htmlFor="origem">Origem</FieldLabel>
							<Select
								value={origem}
								onValueChange={(value) =>
									setValue("origem", value as HierarquiaFormData["origem"], {
										shouldValidate: true,
									})
								}
							>
								<SelectTrigger id="origem" className="w-full">
									<SelectValue placeholder="Selecione a origem" />
								</SelectTrigger>
								<SelectContent>
									{ORIGEM_OPCOES.map((opcao) => (
										<SelectItem key={opcao.value} value={opcao.value}>
											{opcao.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError errors={errors.origem ? [errors.origem] : []} />
						</Field>
					</div>
				</div>

				<div className="mt-6 space-y-4">
					<h2 className="text-lg font-semibold">Garçom (mobile)</h2>
					<div className="flex items-center gap-3 rounded-lg border p-4">
						<Checkbox
							id="enviamobile"
							checked={!!enviamobile}
							onCheckedChange={(checked) =>
								setValue("enviamobile", checked === true, {
									shouldValidate: true,
								})
							}
						/>
						<Label htmlFor="enviamobile" className="cursor-pointer font-normal">
							Exibir no garçom (mobile)
						</Label>
					</div>
					<p className="text-sm text-muted-foreground">
						Grupos marcados aparecem na tela do garçom para lançamento de
						pedidos.
					</p>
				</div>

				<div className="mt-6 flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Cancelar
					</Button>
					<Button type="submit" disabled={isPending}>
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
