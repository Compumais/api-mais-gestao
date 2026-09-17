"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	formatarMoeda,
	formatarQuantidade,
	labelProdutoCotacao,
} from "@/constants/compras-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type PedidoCompraFormData,
	type PedidoCompraItemFormData,
	pedidoCompraFormSchema,
} from "@/schemas/pedido-compra.schema";
import { entidadesService } from "@/services/entidades.service";
import { pedidosCompraService } from "@/services/pedidos-compra.service";
import { ModalItemPedidoCompra } from "./modal-item-pedido-compra";

function totalItem(item: PedidoCompraItemFormData) {
	const qtd = Number.parseFloat(item.quantidade.replace(",", "."));
	const preco = Number.parseFloat(item.precounitario.replace(",", "."));
	if (!Number.isFinite(qtd) || !Number.isFinite(preco)) return 0;
	return Math.round(qtd * preco * 100) / 100;
}

export function PedidoCompraForm() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [modalAberto, setModalAberto] = useState(false);
	const [itemEditarIndex, setItemEditarIndex] = useState<number | null>(null);

	const form = useForm<PedidoCompraFormData>({
		resolver: zodResolver(pedidoCompraFormSchema),
		defaultValues: {
			identidade: "",
			fornecedortelefone: "",
			observacao: "",
			comoCotacao: false,
			tituloCotacao: "",
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
	const identidade = watch("identidade");
	const comoCotacao = watch("comoCotacao");

	const { data: fornecedoresData } = useQuery({
		queryKey: ["entidades-fornecedores-pedido", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return entidadesService.listar({
				idempresa: empresa.id,
				fornecedor: 1,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const fornecedores = fornecedoresData?.data ?? [];
	const opcoesFornecedor = useMemo(
		() =>
			fornecedores.map((entidade) => ({
				value: entidade.id,
				label: entidade.nome,
			})),
		[fornecedores],
	);

	function selecionarFornecedor(id: string) {
		setValue("identidade", id, { shouldValidate: true });
		const fornecedor = fornecedores.find((item) => item.id === id);
		setValue("fornecedortelefone", (fornecedor?.telefone ?? "").slice(0, 20), {
			shouldValidate: true,
		});
	}

	function confirmarItem(dados: PedidoCompraItemFormData) {
		const atuais = form.getValues("itens");
		if (itemEditarIndex !== null) {
			const duplicado = atuais.some(
				(item, index) =>
					index !== itemEditarIndex && item.idproduto === dados.idproduto,
			);
			if (duplicado) {
				toast.error("Este produto já está no pedido");
				return;
			}
			const copia = [...atuais];
			copia[itemEditarIndex] = dados;
			setValue("itens", copia, { shouldValidate: true });
		} else {
			if (atuais.some((item) => item.idproduto === dados.idproduto)) {
				toast.error("Este produto já está no pedido");
				return;
			}
			setValue("itens", [...atuais, dados], { shouldValidate: true });
		}
		setModalAberto(false);
		setItemEditarIndex(null);
	}

	const totalPedido = itens.reduce((acc, item) => acc + totalItem(item), 0);

	const { mutate: salvar, isPending } = useMutation({
		mutationFn: async (data: PedidoCompraFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return pedidosCompraService.criar({
				idempresa: empresa.id,
				identidade: data.identidade,
				fornecedortelefone: data.fornecedortelefone,
				observacao: data.observacao || null,
				comoCotacao: data.comoCotacao,
				tituloCotacao: data.tituloCotacao || null,
				validade: data.validade || null,
				itens: data.itens.map((item) => ({
					idproduto: item.idproduto,
					quantidade: item.quantidade,
					precounitario: item.precounitario,
				})),
			});
		},
		onSuccess: (pedido) => {
			queryClient.invalidateQueries({ queryKey: ["pedidos-compra"] });
			queryClient.invalidateQueries({ queryKey: ["cotacoes-compra"] });
			toast.success(
				pedido.idcotacao
					? "Pedido criado e vinculado à cotação"
					: "Pedido de compra criado",
			);
			router.push(`/compras/pedidos/${pedido.id}`);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao salvar pedido");
		},
	});

	return (
		<>
			<form onSubmit={handleSubmit((data) => salvar(data))}>
				<FieldGroup>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Field data-invalid={!!errors.identidade}>
							<FieldLabel>Fornecedor *</FieldLabel>
							<Combobox
								options={opcoesFornecedor}
								value={identidade}
								onChange={selecionarFornecedor}
								placeholder="Buscar fornecedor cadastrado"
								searchPlaceholder="Nome do fornecedor..."
								emptyMessage="Nenhum fornecedor encontrado."
							/>
							<FieldError
								errors={errors.identidade ? [errors.identidade] : []}
							/>
						</Field>
						<Field data-invalid={!!errors.fornecedortelefone}>
							<FieldLabel htmlFor="fornecedortelefone">Telefone *</FieldLabel>
							<Input
								id="fornecedortelefone"
								placeholder="Preenchido pelo cadastro"
								{...register("fornecedortelefone")}
							/>
							<FieldError
								errors={
									errors.fornecedortelefone ? [errors.fornecedortelefone] : []
								}
							/>
						</Field>
						<Field>
							<FieldLabel>Tipo do documento</FieldLabel>
							<Select
								value={comoCotacao ? "cotacao" : "pedido"}
								onValueChange={(value) =>
									setValue("comoCotacao", value === "cotacao", {
										shouldValidate: true,
									})
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pedido">Pedido de compra</SelectItem>
									<SelectItem value="cotacao">
										Cotação / orçamento
									</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								{comoCotacao
									? "Cria o pedido e uma cotação em rascunho, já vinculada na coluna Cotação."
									: "Cria só o pedido. Depois você pode convertê-lo em cotação."}
							</p>
						</Field>
						{comoCotacao ? (
							<>
								<Field>
									<FieldLabel htmlFor="tituloCotacao">
										Título da cotação
									</FieldLabel>
									<Input
										id="tituloCotacao"
										placeholder="Opcional — gerado automaticamente"
										{...register("tituloCotacao")}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="validade">Validade do link</FieldLabel>
									<Input id="validade" type="date" {...register("validade")} />
								</Field>
							</>
						) : null}
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
								<TableHead className="w-24">Qtd</TableHead>
								<TableHead className="w-32 text-right">Preço</TableHead>
								<TableHead className="w-32 text-right">Total</TableHead>
								<TableHead className="w-12" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{itens.length ? (
								itens.map((item, index) => (
									<TableRow key={`${item.idproduto}-${index}`}>
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
											</button>
										</TableCell>
										<TableCell>{formatarQuantidade(item.quantidade)}</TableCell>
										<TableCell className="text-right">
											{formatarMoeda(item.precounitario)}
										</TableCell>
										<TableCell className="text-right">
											{formatarMoeda(totalItem(item))}
										</TableCell>
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
									<TableCell colSpan={5} className="h-20 text-center">
										Nenhum produto adicionado.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>

					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							Total do pedido: {formatarMoeda(totalPedido)}
						</p>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending ? "Salvando..." : "Salvar pedido"}
							</Button>
						</div>
					</div>
				</FieldGroup>
			</form>

			{empresa && (
				<ModalItemPedidoCompra
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
