"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatarQuantidade, labelProdutoCotacao } from "@/constants/compras-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CotacaoCompraFormData,
	cotacaoCompraFormSchema,
} from "@/schemas/cotacao-compra.schema";
import { cotacoesCompraService } from "@/services/cotacoes-compra.service";
import {
	type ItemCotacaoLocal,
	ModalItemCotacao,
} from "./modal-item-cotacao";

type CotacaoFormProps = {
	modo?: "criar" | "editar";
	cotacaoId?: string;
	valoresIniciais?: Partial<CotacaoCompraFormData>;
};

export function CotacaoCompraForm(props: CotacaoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const isEdicao = (props.modo ?? "criar") === "editar";
	const [modalAberto, setModalAberto] = useState(false);
	const [itemEditarIndex, setItemEditarIndex] = useState<number | null>(null);

	const form = useForm<CotacaoCompraFormData>({
		resolver: zodResolver(cotacaoCompraFormSchema),
		defaultValues: {
			titulo: "",
			observacao: "",
			validade: "",
			itens: [],
		},
	});

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = form;

	const itens = watch("itens");

	useEffect(() => {
		if (!isEdicao || !props.valoresIniciais) return;
		form.reset({
			titulo: props.valoresIniciais.titulo ?? "",
			observacao: props.valoresIniciais.observacao ?? "",
			validade: props.valoresIniciais.validade ?? "",
			itens: props.valoresIniciais.itens ?? [],
		});
	}, [isEdicao, props.valoresIniciais, form]);

	function confirmarItem(dados: ItemCotacaoLocal) {
		const atuais = form.getValues("itens");
		const mesmoItem = (item: ItemCotacaoLocal) => {
			if (dados.idproduto && item.idproduto) {
				return item.idproduto === dados.idproduto;
			}
			if (!dados.idproduto && !item.idproduto) {
				const a = (dados.descricao || dados.nomeproduto || "")
					.trim()
					.toLowerCase();
				const b = (item.descricao || item.nomeproduto || "")
					.trim()
					.toLowerCase();
				return a.length > 0 && a === b;
			}
			return false;
		};

		if (itemEditarIndex !== null) {
			const duplicado = atuais.some(
				(item, index) => index !== itemEditarIndex && mesmoItem(item),
			);
			if (duplicado) {
				toast.error("Este produto já está na cotação");
				return;
			}
			const copia = [...atuais];
			copia[itemEditarIndex] = dados;
			setValue("itens", copia, { shouldValidate: true });
		} else {
			if (atuais.some((item) => mesmoItem(item))) {
				toast.error("Este produto já está na cotação");
				return;
			}
			setValue("itens", [...atuais, dados], { shouldValidate: true });
		}
		setModalAberto(false);
		setItemEditarIndex(null);
	}

	const { mutate: salvar, isPending } = useMutation({
		mutationFn: async (data: CotacaoCompraFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const payload = {
				titulo: data.titulo,
				observacao: data.observacao || null,
				validade: data.validade || null,
				itens: data.itens.map((item) => ({
					idproduto: item.idproduto || null,
					descricao: item.descricao || item.nomeproduto || null,
					quantidade: item.quantidade,
					unidademedida: item.unidademedida ?? null,
				})),
			};
			if (isEdicao && props.cotacaoId) {
				return cotacoesCompraService.atualizar(props.cotacaoId, payload);
			}
			return cotacoesCompraService.criar({
				idempresa: empresa.id,
				...payload,
			});
		},
		onSuccess: (cotacao) => {
			queryClient.invalidateQueries({ queryKey: ["cotacoes-compra"] });
			toast.success(
				isEdicao ? "Cotação atualizada" : "Cotação cadastrada com sucesso",
			);
			router.push(`/compras/cotacoes/${cotacao.id}`);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao salvar cotação");
		},
	});

	return (
		<>
			<form onSubmit={handleSubmit((data) => salvar(data))}>
				<FieldGroup>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Field data-invalid={!!errors.titulo} className="md:col-span-2">
							<FieldLabel htmlFor="titulo">Título *</FieldLabel>
							<Input
								id="titulo"
								placeholder="Ex.: Cotação de embalagens — agosto"
								{...register("titulo")}
							/>
							<FieldError errors={errors.titulo ? [errors.titulo] : []} />
						</Field>
						<Field>
							<FieldLabel htmlFor="validade">Validade do link</FieldLabel>
							<Input id="validade" type="date" {...register("validade")} />
						</Field>
						<Field className="md:col-span-2">
							<FieldLabel htmlFor="observacao">Observação</FieldLabel>
							<Textarea
								id="observacao"
								placeholder="Instruções para o fornecedor (opcional)"
								{...register("observacao")}
							/>
						</Field>
					</div>

					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">Produtos</h2>
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={() => {
								setItemEditarIndex(null);
								setModalAberto(true);
							}}
						>
							<IconPlus className="size-4" />
							Adicionar produto
						</Button>
					</div>
					{errors.itens?.message && (
						<p className="text-sm text-destructive">{errors.itens.message}</p>
					)}

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Produto</TableHead>
								<TableHead className="w-28">Qtd</TableHead>
								<TableHead className="w-24">UM</TableHead>
								<TableHead className="w-12" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{itens.length ? (
								itens.map((item, index) => (
									<TableRow key={`${item.idproduto || item.descricao}-${index}`}>
										<TableCell>
											<button
												type="button"
												className="text-left hover:underline"
												onClick={() => {
													setItemEditarIndex(index);
													setModalAberto(true);
												}}
											>
												{labelProdutoCotacao(item)}
												{!item.idproduto ? (
													<span className="ml-2 text-xs text-muted-foreground">
														não cadastrado
													</span>
												) : null}
											</button>
										</TableCell>
										<TableCell>{formatarQuantidade(item.quantidade)}</TableCell>
										<TableCell>{item.unidademedida ?? "—"}</TableCell>
										<TableCell>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() =>
													setValue(
														"itens",
														itens.filter((_, i) => i !== index),
														{ shouldValidate: true },
													)
												}
											>
												<IconTrash className="size-4" />
											</Button>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={4} className="h-20 text-center">
										Nenhum produto adicionado.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>

					<div className="mt-6 flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => router.back()}>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Salvando..." : isEdicao ? "Salvar" : "Cadastrar"}
						</Button>
					</div>
				</FieldGroup>
			</form>

			{empresa && (
				<ModalItemCotacao
					open={modalAberto}
					onClose={() => {
						setModalAberto(false);
						setItemEditarIndex(null);
					}}
					onConfirmar={confirmarItem}
					idempresa={empresa.id}
					itemParaEditar={
						itemEditarIndex !== null ? itens[itemEditarIndex] : null
					}
				/>
			)}
		</>
	);
}
