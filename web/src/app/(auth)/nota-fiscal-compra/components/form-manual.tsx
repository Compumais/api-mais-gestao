"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type NotaFiscalManualFormData,
	notaFiscalManualSchema,
} from "@/schemas/nota-fiscal.schema";
import { entidadesService } from "@/services/entidades.service";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import {
	CampoCondicaoPagamentoCompra,
	CampoFormaPagamentoCompra,
	CampoPlanoContasDespesa,
} from "./campos-financeiros-nf-compra";

const itemVazio = {
	descricaoproduto: "",
	codigoproduto: "",
	ean: "",
	quantidade: "1",
	precounitario: "0",
	total: "0",
	cfop: "",
	ncm: "",
	unidade: "UN",
};

export function FormManualNotaFiscalCompra() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const form = useForm<NotaFiscalManualFormData>({
		resolver: zodResolver(notaFiscalManualSchema),
		defaultValues: {
			identidade: "",
			numero: "",
			serie: "1",
			modelo: "55",
			chavenfe: "",
			emissao: new Date().toISOString().substring(0, 10),
			entradasaida: new Date().toISOString().substring(0, 10),
			valortotalnota: "",
			observacao: "",
			gerarCustos: true,
			gerarFinanceiro: true,
			itens: [itemVazio],
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

	const { fields, append, remove } = useFieldArray({
		control,
		name: "itens",
	});

	const identidade = watch("identidade");
	const idplanocontas = watch("idplanocontas");
	const idcondicaopagto = watch("idcondicaopagto");
	const idtipodocumento = watch("idtipodocumento");
	const gerarCustos = watch("gerarCustos");
	const gerarFinanceiro = watch("gerarFinanceiro");

	const { data: entidadesData } = useQuery({
		queryKey: ["entidades", empresa?.id, "fornecedores"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return entidadesService.listar({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: criarNota, isPending } = useMutation({
		mutationFn: async (dados: NotaFiscalManualFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");

			const itens = dados.itens.map((item) => {
				const qtd = parseFloat(item.quantidade) || 0;
				const preco = parseFloat(item.precounitario) || 0;
				const total = item.total || (qtd * preco).toFixed(2);
				const codigo = item.codigoproduto?.trim();
				const eanStr = item.ean?.trim();

				return {
					...item,
					descricao: item.descricaoproduto,
					total,
					codigoproduto: codigo ? Number.parseInt(codigo, 10) : undefined,
					ean: eanStr ? eanStr.replace(/\D/g, "") : undefined,
				};
			});

			const totalCalculado = itens.reduce(
				(acc, item) => acc + (parseFloat(String(item.total)) || 0),
				0,
			);

			return notaFiscalService.criar({
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
				idtipodocumento: dados.idtipodocumento || null,
				valortotalnota: dados.valortotalnota || totalCalculado.toFixed(2),
				observacao: dados.observacao || null,
				gerarCustos: dados.gerarCustos,
				gerarFinanceiro: dados.gerarFinanceiro,
				itens,
			});
		},
		onSuccess: () => {
			toast.success("Nota fiscal de compra criada com sucesso");
			queryClient.invalidateQueries({ queryKey: ["notas-fiscais-compra"] });
			router.push("/nota-fiscal-compra");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar nota fiscal");
		},
	});

	if (!empresa) {
		return (
			<p className="text-muted-foreground">
				Selecione uma empresa para incluir a nota fiscal.
			</p>
		);
	}

	return (
		<form
			onSubmit={handleSubmit((dados) => criarNota(dados))}
			className="flex flex-col gap-6"
		>
			<FieldGroup>
				<h2 className="text-lg font-semibold">Dados da nota</h2>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					<Field>
						<FieldLabel htmlFor="numero">Número</FieldLabel>
						<Input id="numero" {...register("numero")} placeholder="000123" />
					</Field>
					<Field>
						<FieldLabel htmlFor="serie">Série</FieldLabel>
						<Input id="serie" {...register("serie")} />
					</Field>
					<Field>
						<FieldLabel htmlFor="modelo">Modelo</FieldLabel>
						<Input id="modelo" {...register("modelo")} placeholder="55" />
					</Field>
					<Field className="md:col-span-2 lg:col-span-3">
						<FieldLabel htmlFor="chavenfe">Chave NF-e</FieldLabel>
						<Input
							id="chavenfe"
							{...register("chavenfe")}
							placeholder="44 dígitos"
							maxLength={44}
						/>
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
						<Input
							id="valortotalnota"
							{...register("valortotalnota")}
							placeholder="Calculado pelos itens se vazio"
						/>
					</Field>
					<Field className="md:col-span-2">
						<FieldLabel htmlFor="identidade">Fornecedor</FieldLabel>
						<Select
							value={identidade || ""}
							onValueChange={(value) =>
								setValue("identidade", value === "none" ? "" : value)
							}
						>
							<SelectTrigger id="identidade">
								<SelectValue placeholder="Selecione o fornecedor" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Sem fornecedor vinculado</SelectItem>
								{entidadesData?.data.map((entidade) => (
									<SelectItem key={entidade.id} value={entidade.id}>
										{entidade.nome}
										{entidade.cnpjcpf ? ` — ${entidade.cnpjcpf}` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field className="md:col-span-2 lg:col-span-3">
						<FieldLabel htmlFor="observacao">Observação</FieldLabel>
						<Textarea id="observacao" {...register("observacao")} rows={2} />
					</Field>
				</div>
			</FieldGroup>

			<FieldGroup>
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Itens</h2>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => append(itemVazio)}
					>
						<IconPlus className="size-4" />
						Adicionar item
					</Button>
				</div>

				{errors.itens?.message && (
					<p className="text-sm text-destructive">{errors.itens.message}</p>
				)}

				<div className="flex flex-col gap-4">
					{fields.map((field, index) => (
						<div
							key={field.id}
							className="rounded-lg border p-4 flex flex-col gap-3"
						>
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Item {index + 1}</span>
								{fields.length > 1 && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => remove(index)}
										aria-label={`Remover item ${index + 1}`}
									>
										<IconTrash className="size-4 text-destructive" />
									</Button>
								)}
							</div>
							<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
								<Field className="md:col-span-2">
									<FieldLabel>Descrição *</FieldLabel>
									<Input
										{...register(`itens.${index}.descricaoproduto`)}
										placeholder="Nome do produto"
									/>
									{errors.itens?.[index]?.descricaoproduto && (
										<FieldError>
											{errors.itens[index]?.descricaoproduto?.message}
										</FieldError>
									)}
								</Field>
								<Field>
									<FieldLabel>Código</FieldLabel>
									<Input {...register(`itens.${index}.codigoproduto`)} />
								</Field>
								<Field>
									<FieldLabel>EAN</FieldLabel>
									<Input {...register(`itens.${index}.ean`)} />
								</Field>
								<Field>
									<FieldLabel>Quantidade *</FieldLabel>
									<Input {...register(`itens.${index}.quantidade`)} />
								</Field>
								<Field>
									<FieldLabel>Preço unit. *</FieldLabel>
									<Input {...register(`itens.${index}.precounitario`)} />
								</Field>
								<Field>
									<FieldLabel>CFOP</FieldLabel>
									<Input {...register(`itens.${index}.cfop`)} />
								</Field>
								<Field>
									<FieldLabel>NCM</FieldLabel>
									<Input {...register(`itens.${index}.ncm`)} />
								</Field>
								<Field>
									<FieldLabel>Unidade</FieldLabel>
									<Input {...register(`itens.${index}.unidade`)} />
								</Field>
							</div>
						</div>
					))}
				</div>
			</FieldGroup>

			<FieldGroup>
				<h2 className="text-lg font-semibold">Financeiro</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<CampoPlanoContasDespesa
						value={idplanocontas}
						onChange={(value) => setValue("idplanocontas", value)}
					/>
					<CampoFormaPagamentoCompra
						value={idtipodocumento}
						onChange={(value) => setValue("idtipodocumento", value)}
					/>
					<CampoCondicaoPagamentoCompra
						value={idcondicaopagto}
						onChange={(value) => setValue("idcondicaopagto", value)}
					/>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
					<div className="flex items-center gap-2">
						<Checkbox
							id="gerarCustos"
							checked={gerarCustos}
							onCheckedChange={(checked) =>
								setValue("gerarCustos", checked === true)
							}
						/>
						<Label htmlFor="gerarCustos">Registrar custos dos produtos</Label>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id="gerarFinanceiro"
							checked={gerarFinanceiro}
							onCheckedChange={(checked) =>
								setValue("gerarFinanceiro", checked === true)
							}
						/>
						<Label htmlFor="gerarFinanceiro">
							Gerar contas a pagar automaticamente
						</Label>
					</div>
				</div>
			</FieldGroup>

			<div className="flex gap-3 justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/nota-fiscal-compra")}
				>
					Cancelar
				</Button>
				<Button type="submit" disabled={isPending}>
					{isPending ? "Salvando..." : "Salvar nota fiscal"}
				</Button>
			</div>
		</form>
	);
}
