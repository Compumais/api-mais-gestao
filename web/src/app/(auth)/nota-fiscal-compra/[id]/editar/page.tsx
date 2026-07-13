"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowLeft } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type NotaFiscalCompraEdicaoFormData,
	notaFiscalCompraEdicaoSchema,
} from "@/schemas/nota-fiscal.schema";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import {
	CampoCondicaoPagamentoCompra,
	CampoPlanoContasDespesa,
} from "../../components/campos-financeiros-nf-compra";

const STATUS_CANCELADA = 2;

export default function EditarNotaFiscalCompraPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const id = params.id;

	const { data, isLoading, isError } = useQuery({
		queryKey: ["nota-fiscal-compra", id],
		queryFn: () => notaFiscalService.buscar(id),
		enabled: !!id,
	});

	const form = useForm<NotaFiscalCompraEdicaoFormData>({
		resolver: zodResolver(notaFiscalCompraEdicaoSchema),
		defaultValues: {
			identidade: "",
			numero: "",
			serie: "",
			modelo: "55",
			chavenfe: "",
			emissao: "",
			entradasaida: "",
			idplanocontas: "",
			idcondicaopagto: "",
			valortotalnota: "",
			observacao: "",
			itens: [],
		},
	});

	const {
		register,
		handleSubmit,
		control,
		reset,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const { fields } = useFieldArray({
		control,
		name: "itens",
	});

	useEffect(() => {
		if (!data) return;
		const nota = data.notaFiscal;
		reset({
			identidade: nota.identidade ?? "",
			numero: nota.numero ?? nota.numeronotafiscal ?? "",
			serie: nota.serie ?? "",
			modelo: nota.modelo ?? "55",
			chavenfe: nota.chavenfe ?? "",
			emissao: nota.emissao?.substring(0, 10) ?? "",
			entradasaida: nota.entradasaida?.substring(0, 10) ?? "",
			idplanocontas: nota.idplanocontas ?? "",
			idcondicaopagto: nota.idcondicaopagto ?? "",
			valortotalnota: nota.valortotalnota ?? "",
			observacao: nota.observacao ?? "",
			itens: data.itens.map((item) => ({
				id: item.id,
				descricao: item.descricao ?? "",
				quantidade: item.quantidade ?? "0",
				precounitario: item.precounitario ?? "0",
				total: item.total ?? "",
				cfop: item.cfop ?? "",
				ncm: item.ncm ?? "",
				unidade: item.unidade ?? "",
			})),
		});
	}, [data, reset]);

	const { mutate: salvar, isPending } = useMutation({
		mutationFn: async (dados: NotaFiscalCompraEdicaoFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");

			const itens = dados.itens.map((item) => {
				const qtd = parseFloat(item.quantidade) || 0;
				const preco = parseFloat(item.precounitario) || 0;
				const total = item.total || (qtd * preco).toFixed(2);
				return { ...item, total };
			});

			const totalCalculado = itens.reduce(
				(acc, item) => acc + (parseFloat(String(item.total)) || 0),
				0,
			);

			return notaFiscalService.atualizarCompra(id, {
				idempresa: empresa.id,
				identidade: dados.identidade || null,
				numero: dados.numero || null,
				serie: dados.serie || null,
				modelo: dados.modelo || null,
				chavenfe: dados.chavenfe || null,
				emissao: dados.emissao || null,
				entradasaida: dados.entradasaida || null,
				idplanocontas: dados.idplanocontas || null,
				idcondicaopagto: dados.idcondicaopagto || null,
				valortotalnota: dados.valortotalnota || totalCalculado.toFixed(2),
				observacao: dados.observacao || null,
				itens,
				reintegrarEstoqueFinanceiro: true,
			});
		},
		onSuccess: (resultado) => {
			toast.success("Nota fiscal atualizada");
			if (resultado.avisos?.length) {
				for (const aviso of resultado.avisos) {
					toast.warning(aviso);
				}
			}
			queryClient.invalidateQueries({ queryKey: ["notas-fiscais-compra"] });
			queryClient.invalidateQueries({ queryKey: ["nota-fiscal-compra", id] });
			router.push("/nota-fiscal-compra");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar nota fiscal");
		},
	});

	if (!empresa) {
		return (
			<PageContainer>
				<p className="p-4 text-muted-foreground">Selecione uma empresa.</p>
			</PageContainer>
		);
	}

	if (isLoading) {
		return (
			<PageContainer>
				<TableSkeleton rows={6} columns={4}>
					<TableCell>Campo</TableCell>
				</TableSkeleton>
			</PageContainer>
		);
	}

	if (isError || !data) {
		return (
			<PageContainer>
				<p className="p-4 text-destructive">Nota fiscal não encontrada.</p>
			</PageContainer>
		);
	}

	if (data.notaFiscal.status === STATUS_CANCELADA) {
		return (
			<PageContainer>
				<div className="flex flex-col gap-4 p-4">
					<p className="text-destructive">
						Esta nota está cancelada e não pode ser editada.
					</p>
					<Button asChild variant="outline">
						<Link href="/nota-fiscal-compra">Voltar</Link>
					</Button>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center gap-3 px-4">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/nota-fiscal-compra" aria-label="Voltar">
							<IconArrowLeft className="size-5" />
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-bold">Editar NF de compra</h1>
						<p className="text-sm text-muted-foreground">
							Ajustes reintegram estoque e financeiro quando a nota já estava
							confirmada.
						</p>
					</div>
				</div>

				<form
					className="mx-4 flex flex-col gap-6"
					onSubmit={handleSubmit((dados) => salvar(dados))}
				>
					<section className="rounded-lg border bg-card p-4">
						<h2 className="mb-4 text-lg font-semibold">Cabeçalho</h2>
						<FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<Field>
								<FieldLabel htmlFor="numero">Número</FieldLabel>
								<Input id="numero" {...register("numero")} />
								{errors.numero ? (
									<FieldError>{errors.numero.message}</FieldError>
								) : null}
							</Field>
							<Field>
								<FieldLabel htmlFor="serie">Série</FieldLabel>
								<Input id="serie" {...register("serie")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="modelo">Modelo</FieldLabel>
								<Input id="modelo" {...register("modelo")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="chavenfe">Chave NF-e</FieldLabel>
								<Input id="chavenfe" {...register("chavenfe")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="emissao">Emissão</FieldLabel>
								<Input id="emissao" type="date" {...register("emissao")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="entradasaida">Entrada</FieldLabel>
								<Input
									id="entradasaida"
									type="date"
									{...register("entradasaida")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="valortotalnota">Valor total</FieldLabel>
								<Input id="valortotalnota" {...register("valortotalnota")} />
							</Field>
							<CampoPlanoContasDespesa
								value={watch("idplanocontas") ?? ""}
								onChange={(valor) =>
									setValue("idplanocontas", valor, { shouldDirty: true })
								}
							/>
							<CampoCondicaoPagamentoCompra
								value={watch("idcondicaopagto") ?? ""}
								onChange={(valor) =>
									setValue("idcondicaopagto", valor, { shouldDirty: true })
								}
							/>
							<Field className="sm:col-span-2 lg:col-span-3">
								<FieldLabel htmlFor="observacao">Observação</FieldLabel>
								<Textarea id="observacao" {...register("observacao")} />
							</Field>
						</FieldGroup>
					</section>

					<section className="rounded-lg border bg-card p-4">
						<h2 className="mb-4 text-lg font-semibold">Itens</h2>
						<div className="flex flex-col gap-4">
							{fields.map((field, index) => (
								<div
									key={field.id}
									className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4"
								>
									<input type="hidden" {...register(`itens.${index}.id`)} />
									<Field className="sm:col-span-2 lg:col-span-4">
										<FieldLabel htmlFor={`itens.${index}.descricao`}>
											Descrição
										</FieldLabel>
										<Input
											id={`itens.${index}.descricao`}
											{...register(`itens.${index}.descricao`)}
										/>
										{errors.itens?.[index]?.descricao ? (
											<FieldError>
												{errors.itens[index]?.descricao?.message}
											</FieldError>
										) : null}
									</Field>
									<Field>
										<FieldLabel htmlFor={`itens.${index}.quantidade`}>
											Quantidade
										</FieldLabel>
										<Input
											id={`itens.${index}.quantidade`}
											{...register(`itens.${index}.quantidade`)}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={`itens.${index}.precounitario`}>
											Preço unitário
										</FieldLabel>
										<Input
											id={`itens.${index}.precounitario`}
											{...register(`itens.${index}.precounitario`)}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={`itens.${index}.cfop`}>CFOP</FieldLabel>
										<Input
											id={`itens.${index}.cfop`}
											{...register(`itens.${index}.cfop`)}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={`itens.${index}.ncm`}>NCM</FieldLabel>
										<Input
											id={`itens.${index}.ncm`}
											{...register(`itens.${index}.ncm`)}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={`itens.${index}.unidade`}>
											Unidade
										</FieldLabel>
										<Input
											id={`itens.${index}.unidade`}
											{...register(`itens.${index}.unidade`)}
										/>
									</Field>
								</div>
							))}
						</div>
					</section>

					<div className="flex justify-end gap-2 pb-6">
						<Button type="button" variant="outline" asChild>
							<Link href="/nota-fiscal-compra">Cancelar</Link>
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Salvando..." : "Salvar alterações"}
						</Button>
					</div>
				</form>
			</div>
		</PageContainer>
	);
}
