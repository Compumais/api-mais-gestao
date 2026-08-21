"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type FichaProducaoFormData,
	fichaProducaoFormSchema,
} from "@/schemas/ficha-producao.schema";
import { fichaProducaoService } from "@/services/ficha-producao.service";
import { produtosService } from "@/services/produtos.service";

type FichaProducaoFormProps = {
	modo?: "criar" | "editar";
	fichaId?: string;
	valoresIniciais?: Partial<FichaProducaoFormData>;
};

function labelProduto(p: {
	codigo?: number | string | null;
	nome?: string | null;
}) {
	const codigo = p.codigo != null ? String(p.codigo) : "";
	const nome = p.nome ?? "";
	return codigo ? `${codigo} - ${nome}` : nome;
}

export function FichaProducaoForm(props: FichaProducaoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<FichaProducaoFormData>({
		resolver: zodResolver(fichaProducaoFormSchema),
		defaultValues: {
			idprodutoacabado: "",
			permiteproducaomassa: true,
			producaonavenda: false,
			observacao: "",
			ativo: true,
			itens: [{ idproduto: "", quantidade: "1" }],
		},
	});

	const {
		control,
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = form;

	const { fields, append, remove } = useFieldArray({
		control,
		name: "itens",
	});

	useEffect(() => {
		if (!isEdicao || !props.valoresIniciais) return;
		form.reset({
			idprodutoacabado: props.valoresIniciais.idprodutoacabado ?? "",
			permiteproducaomassa:
				props.valoresIniciais.permiteproducaomassa ?? true,
			producaonavenda: props.valoresIniciais.producaonavenda ?? false,
			observacao: props.valoresIniciais.observacao ?? "",
			ativo: props.valoresIniciais.ativo ?? true,
			itens:
				props.valoresIniciais.itens &&
				props.valoresIniciais.itens.length > 0
					? props.valoresIniciais.itens
					: [{ idproduto: "", quantidade: "1" }],
		});
	}, [isEdicao, props.valoresIniciais, form]);

	const { data: produtos = [] } = useQuery({
		queryKey: ["produtos-ficha-producao", empresa?.id],
		queryFn: () =>
			produtosService.listarTodos({
				idempresa: empresa!.id,
				tipo: "P",
				inativo: 0,
			}),
		enabled: !!empresa?.id,
	});

	const opcoesProdutos = useMemo(
		() =>
			produtos.map((p) => ({
				value: p.id,
				label: labelProduto(p),
			})),
		[produtos],
	);

	const idAcabado = watch("idprodutoacabado");
	const itens = watch("itens");
	const permiteMassa = watch("permiteproducaomassa");
	const producaoVenda = watch("producaonavenda");

	const previewConsumo = useMemo(() => {
		const mapa = new Map(produtos.map((p) => [p.id, p]));
		return (itens ?? [])
			.filter((item) => item.idproduto && item.quantidade)
			.map((item) => {
				const produto = mapa.get(item.idproduto);
				const qtdUnit = Number.parseFloat(
					String(item.quantidade).replace(",", "."),
				);
				return {
					idproduto: item.idproduto,
					nome: produto ? labelProduto(produto) : item.idproduto,
					porUnidade: Number.isNaN(qtdUnit) ? 0 : qtdUnit,
					paraDez: Number.isNaN(qtdUnit) ? 0 : qtdUnit * 10,
				};
			});
	}, [itens, produtos]);

	const { mutate: criar, isPending: pendingCriar } = useMutation({
		mutationFn: fichaProducaoService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fichas-producao"] });
			toast.success("Ficha de produção criada com sucesso");
			router.push("/fichas-producao");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar ficha de produção");
		},
	});

	const { mutate: atualizar, isPending: pendingAtualizar } = useMutation({
		mutationFn: async (dados: FichaProducaoFormData) => {
			if (!props.fichaId) throw new Error("ID da ficha obrigatório");
			return fichaProducaoService.atualizar(props.fichaId, {
				idprodutoacabado: dados.idprodutoacabado,
				permiteproducaomassa: dados.permiteproducaomassa,
				producaonavenda: dados.producaonavenda,
				observacao: dados.observacao ?? null,
				ativo: dados.ativo ?? true,
				itens: dados.itens.map((item, index) => ({
					idproduto: item.idproduto,
					quantidade: item.quantidade.replace(",", "."),
					ordem: index,
				})),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fichas-producao"] });
			toast.success("Ficha de produção atualizada");
			router.push("/fichas-producao");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar ficha");
		},
	});

	const onSubmit = (data: FichaProducaoFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		const payload = {
			idprodutoacabado: data.idprodutoacabado,
			permiteproducaomassa: data.permiteproducaomassa,
			producaonavenda: data.producaonavenda,
			observacao: data.observacao ?? null,
			itens: data.itens.map((item, index) => ({
				idproduto: item.idproduto,
				quantidade: item.quantidade.replace(",", "."),
				ordem: index,
			})),
		};

		if (!isEdicao) {
			criar({ ...payload, idempresa: empresa.id });
			return;
		}
		atualizar(data);
	};

	const pending = pendingCriar || pendingAtualizar;

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="idprodutoacabado">Produto acabado</FieldLabel>
					<Combobox
						options={opcoesProdutos}
						value={idAcabado}
						onChange={(value) =>
							setValue("idprodutoacabado", value, { shouldValidate: true })
						}
						placeholder="Selecione o produto a fabricar"
						searchPlaceholder="Buscar produto..."
						disabled={isEdicao}
					/>
					{errors.idprodutoacabado && (
						<FieldError>{errors.idprodutoacabado.message}</FieldError>
					)}
				</Field>

				<div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
					<label className="flex items-center gap-2 text-sm">
						<Checkbox
							checked={permiteMassa}
							onCheckedChange={(checked) =>
								setValue("permiteproducaomassa", checked === true, {
									shouldValidate: true,
								})
							}
						/>
						Produzir em massa
					</label>
					<label className="flex items-center gap-2 text-sm">
						<Checkbox
							checked={producaoVenda}
							onCheckedChange={(checked) =>
								setValue("producaonavenda", checked === true, {
									shouldValidate: true,
								})
							}
						/>
						Produzir na venda
					</label>
				</div>
				{errors.permiteproducaomassa && (
					<FieldError>{errors.permiteproducaomassa.message}</FieldError>
				)}

				{isEdicao && (
					<label className="flex items-center gap-2 text-sm">
						<Checkbox
							checked={watch("ativo") ?? true}
							onCheckedChange={(checked) =>
								setValue("ativo", checked === true)
							}
						/>
						Ficha ativa
					</label>
				)}

				<Field>
					<FieldLabel htmlFor="observacao">Observação</FieldLabel>
					<Textarea id="observacao" rows={2} {...register("observacao")} />
				</Field>
			</FieldGroup>

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Componentes</h2>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => append({ idproduto: "", quantidade: "1" })}
					>
						<IconPlus className="size-4" />
						Adicionar
					</Button>
				</div>

				{errors.itens && typeof errors.itens.message === "string" && (
					<FieldError>{errors.itens.message}</FieldError>
				)}

				<div className="space-y-3">
					{fields.map((field, index) => (
						<div
							key={field.id}
							className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_140px_auto]"
						>
							<Field>
								<FieldLabel>Componente</FieldLabel>
								<Combobox
									options={opcoesProdutos.filter(
										(opt) => opt.value !== idAcabado,
									)}
									value={watch(`itens.${index}.idproduto`)}
									onChange={(value) =>
										setValue(`itens.${index}.idproduto`, value, {
											shouldValidate: true,
										})
									}
									placeholder="Selecione o insumo"
									searchPlaceholder="Buscar..."
								/>
								{errors.itens?.[index]?.idproduto && (
									<FieldError>
										{errors.itens[index]?.idproduto?.message}
									</FieldError>
								)}
							</Field>
							<Field>
								<FieldLabel>Qtd / unidade</FieldLabel>
								<Input
									{...register(`itens.${index}.quantidade`)}
									placeholder="0,5"
								/>
								{errors.itens?.[index]?.quantidade && (
									<FieldError>
										{errors.itens[index]?.quantidade?.message}
									</FieldError>
								)}
							</Field>
							<div className="flex items-end">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label="Remover componente"
									disabled={fields.length <= 1}
									onClick={() => remove(index)}
								>
									<IconTrash className="size-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			</div>

			{previewConsumo.length > 0 && (
				<div className="rounded-md border bg-muted/40 p-3 text-sm">
					<p className="mb-2 font-medium">
						Preview: consumo para 10 unidades do acabado
					</p>
					<ul className="space-y-1">
						{previewConsumo.map((linha) => (
							<li key={linha.idproduto}>
								{linha.nome}:{" "}
								<span className="tabular-nums">
									{linha.paraDez.toLocaleString("pt-BR", {
										maximumFractionDigits: 6,
									})}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/fichas-producao")}
				>
					Cancelar
				</Button>
				<Button type="submit" disabled={pending}>
					{isEdicao ? "Salvar" : "Criar ficha"}
				</Button>
			</div>
		</form>
	);
}
