"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
import { MoneyInput } from "@/components/ui/money-input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmpresa } from "@/hooks/use-empresa";
import { useProximoCodigo } from "@/hooks/use-proximo-codigo";
import {
	type ProdutoFormData,
	produtoFormSchema,
} from "@/schemas/produtos.schema";
import { entidadesService } from "@/services/entidades.service";
import { hierarquiasService } from "@/services/hierarquias.service";
import { produtosService, type CriarProdutoData } from "@/services/produtos.service";
import {
	isUnidadeMedidaGlobal,
	unidadeMedidaService,
} from "@/services/unidade-medida.service";
import { ProdutoAbaImpostos } from "./produto-aba-impostos";

type ProdutoFormProps = {
	modo?: "criar" | "editar";
	produtoId?: string;
	valoresIniciais?: Partial<ProdutoFormData>;
};

function textoOuNulo(valor: string | null | undefined): string | null {
	const texto = valor?.trim();
	return texto ? texto : null;
}

function buildProdutoPayload(
	data: ProdutoFormData,
): Omit<CriarProdutoData, "idempresa"> {
	const payload: Omit<CriarProdutoData, "idempresa"> = {
		codigo: data.codigo,
		nome: data.nome.trim(),
		idunidademedida: data.idunidademedida,
		idgrupo: data.idgrupo,
		preco: data.preco,
		tipo: data.tipo,
		ippt: data.ippt,
		origem: data.origem,
		ncm: data.ncm.trim(),
	};

	if (data.ean != null && !Number.isNaN(data.ean)) {
		payload.ean = data.ean;
	}

	const referencia = data.referencia?.trim();
	if (referencia) {
		payload.referencia = referencia;
	}

	if (data.fornecedor) {
		payload.fornecedor = data.fornecedor;
	}

	if (data.iat) {
		payload.iat = data.iat;
	}

	const observacoes = data.observacoes?.trim();
	if (observacoes) {
		payload.observacoes = observacoes;
	}

	payload.enviamobile = data.enviamobile ? 1 : 0;
	payload.quantidadepadrao = data.quantidadepadrao ?? 0;

	const custoaquisicao = data.custoaquisicao?.trim();
	if (custoaquisicao) {
		payload.custoaquisicao = custoaquisicao;
	}

	if (data.quantidademinima != null) {
		payload.quantidademinima = data.quantidademinima;
	}
	if (data.quantidademaxima != null) {
		payload.quantidademaxima = data.quantidademaxima;
	}

	payload.idcfopentrada = data.idcfopentrada || null;
	payload.idcfopsaida = data.idcfopsaida || null;
	payload.idcfopsaidanfce = data.idcfopsaidanfce || null;
	payload.tipoproduto = data.tipoproduto || null;
	payload.idcest = data.idcest || null;
	payload.idtaxauf = data.idtaxauf || null;
	payload.situacaotributariasnentrada = textoOuNulo(
		data.situacaotributariasnentrada,
	);
	payload.situacaotributaria = textoOuNulo(data.situacaotributaria);
	payload.situacaotributariasn = textoOuNulo(data.situacaotributariasn);
	payload.tributacaoespecial = textoOuNulo(data.tributacaoespecial);
	payload.tributacaosn = textoOuNulo(data.tributacaosn);
	payload.cstpisentrada = textoOuNulo(data.cstpisentrada);
	payload.cstcofinsentrada = textoOuNulo(data.cstcofinsentrada);
	payload.cstpis = textoOuNulo(data.cstpis);
	payload.cstcofins = textoOuNulo(data.cstcofins);
	payload.cstipientrada = textoOuNulo(data.cstipientrada);
	payload.cstipisaida = textoOuNulo(data.cstipisaida);

	return payload;
}

export function ProdutoForm(props: ProdutoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<ProdutoFormData>({
		resolver: zodResolver(produtoFormSchema) as Resolver<ProdutoFormData>,
		shouldUnregister: false,
		defaultValues: {
			codigo: undefined,
			ean: null,
			referencia: null,
			nome: "",
			idunidademedida: "",
			fornecedor: null,
			idgrupo: "",
			preco: "",
			custoaquisicao: "",
			tipo: "P",
			iat: null,
			ippt: "P",
			origem: 0,
			ncm: "",
			tipoproduto: null,
			idcfopentrada: null,
			idcfopsaida: null,
			idcfopsaidanfce: null,
			idcest: null,
			idtaxauf: null,
			situacaotributariasnentrada: null,
			situacaotributaria: null,
			situacaotributariasn: null,
			tributacaoespecial: null,
			tributacaosn: null,
			cstpisentrada: null,
			cstcofinsentrada: null,
			cstpis: null,
			cstcofins: null,
			cstipientrada: null,
			cstipisaida: null,
			observacoes: null,
			enviamobile: false,
			quantidadepadrao: 0,
			quantidademinima: null,
			quantidademaxima: null,
			...(isEdicao && props.valoresIniciais ? props.valoresIniciais : {}),
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		getValues,
		control,
		formState: { errors },
	} = form;

	const idunidademedida = watch("idunidademedida");
	const fornecedor = watch("fornecedor");
	const idgrupo = watch("idgrupo");
	const tipo = watch("tipo");
	const tipoproduto = watch("tipoproduto");
	const iat = watch("iat");
	const ippt = watch("ippt");
	const preco = watch("preco");
	const custoaquisicao = watch("custoaquisicao");
	const enviamobile = watch("enviamobile");
	const codigo = watch("codigo");

	useProximoCodigo({
		idempresa: empresa?.id,
		enabled: !isEdicao,
		fetchFn: produtosService.buscarProximoCodigo,
		setValue,
		valorCodigoAtual: codigo,
	});

	useEffect(() => {
		if (tipo === "S" && !tipoproduto) {
			setValue("tipoproduto", "09", { shouldValidate: true });
		}
	}, [tipo, tipoproduto, setValue]);

	const { data: unidadesData } = useQuery({
		queryKey: ["unidades-medida", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return await unidadeMedidaService.listar({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const { data: gruposData } = useQuery({
		queryKey: ["hierarquias", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return await hierarquiasService.listar({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const { data: fornecedoresData } = useQuery({
		queryKey: ["entidades-fornecedores", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return await entidadesService.listar({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: criarProduto, isPending: isPendingCriar } = useMutation({
		mutationFn: produtosService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["produtos"] });
			queryClient.invalidateQueries({ queryKey: ["saldos-estoque"] });
			toast.success("Produto cadastrado com sucesso!");
			router.push("/produtos");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar produto");
		},
	});

	const { mutate: atualizarProduto, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async ({
				idempresa,
				dados,
			}: {
				idempresa: string;
				dados: Parameters<typeof produtosService.atualizar>[1];
			}) => {
				if (!isEdicao || !props.produtoId) {
					throw new Error("ID do produto é obrigatório para editar");
				}
				return await produtosService.atualizar(
					props.produtoId,
					dados,
					idempresa,
				);
			},
			onSuccess: (produto) => {
				queryClient.invalidateQueries({ queryKey: ["produtos"] });
				queryClient.invalidateQueries({ queryKey: ["saldos-estoque"] });
				if (props.produtoId) {
					queryClient.setQueryData(["produto", props.produtoId], produto);
				}
				toast.success("Produto atualizado com sucesso!");
				router.push("/produtos");
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar produto");
			},
		});

	const onSubmit = () => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		const payloadBase = buildProdutoPayload(getValues());

		if (!isEdicao) {
			criarProduto({
				idempresa: empresa.id,
				...payloadBase,
			});
			return;
		}

		atualizarProduto({ idempresa: empresa.id, dados: payloadBase });
	};

	const unidadesGlobais =
		unidadesData?.data.filter((unidade) => isUnidadeMedidaGlobal(unidade)) ?? [];
	const unidadesEmpresa =
		unidadesData?.data.filter((unidade) => !isUnidadeMedidaGlobal(unidade)) ?? [];

	const isPending = isPendingCriar || isPendingAtualizar;

	if (!empresa) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				Selecione uma empresa no menu superior para cadastrar produtos.
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<Tabs defaultValue="geral" className="w-full">
				<TabsList className="mb-6">
					<TabsTrigger value="geral">Geral</TabsTrigger>
					<TabsTrigger value="impostos">Impostos</TabsTrigger>
				</TabsList>

				<TabsContent value="geral">
					<FieldGroup>
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Dados do Produto</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.codigo}>
							<FieldLabel htmlFor="codigo">Código *</FieldLabel>
							<Input
								id="codigo"
								type="number"
								min={1}
								placeholder="Código do produto"
								aria-invalid={!!errors.codigo}
								{...register("codigo", {
									valueAsNumber: true,
									validate: (value) =>
										!Number.isNaN(value) || "Código é obrigatório",
								})}
							/>
							<p className="text-sm text-muted-foreground">
								Preenchido automaticamente; pode ser alterado.
							</p>
							<FieldError errors={errors.codigo ? [errors.codigo] : []} />
						</Field>

						<Field data-invalid={!!errors.ean}>
							<FieldLabel htmlFor="ean">Código de Barras</FieldLabel>
							<Input
								id="ean"
								type="number"
								placeholder="Código de barras (EAN)"
								aria-invalid={!!errors.ean}
								{...register("ean", {
									setValueAs: (value) =>
										value === "" || value === null || value === undefined
											? null
											: Number(value),
								})}
							/>
							<FieldError errors={errors.ean ? [errors.ean] : []} />
						</Field>

						<Field data-invalid={!!errors.referencia}>
							<FieldLabel htmlFor="referencia">Referência</FieldLabel>
							<Input
								id="referencia"
								placeholder="Referência do produto"
								aria-invalid={!!errors.referencia}
								{...register("referencia")}
							/>
							<FieldError
								errors={errors.referencia ? [errors.referencia] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.nome}>
							<FieldLabel htmlFor="nome">Nome *</FieldLabel>
							<Input
								id="nome"
								placeholder="Nome do produto"
								aria-invalid={!!errors.nome}
								{...register("nome")}
							/>
							<FieldError errors={errors.nome ? [errors.nome] : []} />
						</Field>

						<Field data-invalid={!!errors.idunidademedida}>
							<FieldLabel htmlFor="idunidademedida">Unidade *</FieldLabel>
							<Select
								value={idunidademedida || undefined}
								onValueChange={(value) => setValue("idunidademedida", value)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione a unidade" />
								</SelectTrigger>
								<SelectContent>
									{unidadesGlobais.length > 0 && (
										<SelectGroup>
											<SelectLabel>Padrão do sistema</SelectLabel>
											{unidadesGlobais.map((unidade) => (
												<SelectItem key={unidade.id} value={unidade.id}>
													{unidade.nome || unidade.codigo || unidade.id}
												</SelectItem>
											))}
										</SelectGroup>
									)}
									{unidadesEmpresa.length > 0 && (
										<SelectGroup>
											<SelectLabel>Da empresa</SelectLabel>
											{unidadesEmpresa.map((unidade) => (
												<SelectItem key={unidade.id} value={unidade.id}>
													{unidade.nome || unidade.codigo || unidade.id}
												</SelectItem>
											))}
										</SelectGroup>
									)}
								</SelectContent>
							</Select>
							<FieldError
								errors={
									errors.idunidademedida ? [errors.idunidademedida] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.fornecedor}>
							<FieldLabel htmlFor="fornecedor">Fornecedor</FieldLabel>
							<Select
								value={fornecedor || "none"}
								onValueChange={(value) =>
									setValue("fornecedor", value === "none" ? null : value)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione o fornecedor" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Nenhum</SelectItem>
									{fornecedoresData?.data.map((entidade) => (
										<SelectItem key={entidade.id} value={entidade.id}>
											{entidade.nome}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError
								errors={errors.fornecedor ? [errors.fornecedor] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.idgrupo}>
							<FieldLabel htmlFor="idgrupo">Grupo *</FieldLabel>
							<Select
								value={idgrupo || undefined}
								onValueChange={(value) => setValue("idgrupo", value)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione o grupo" />
								</SelectTrigger>
								<SelectContent>
									{gruposData?.data.map((grupo) => (
										<SelectItem key={grupo.id} value={grupo.id}>
											{grupo.nome || grupo.codigo || grupo.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError errors={errors.idgrupo ? [errors.idgrupo] : []} />
						</Field>

						<Field data-invalid={!!errors.preco}>
							<FieldLabel htmlFor="preco">Preço de venda *</FieldLabel>
							<MoneyInput
								id="preco"
								value={preco}
								onChange={(value) => setValue("preco", value, { shouldValidate: true })}
								aria-invalid={!!errors.preco}
							/>
							<FieldError errors={errors.preco ? [errors.preco] : []} />
						</Field>

						<Field data-invalid={!!errors.custoaquisicao}>
							<FieldLabel htmlFor="custoaquisicao">Preço de custo</FieldLabel>
							<MoneyInput
								id="custoaquisicao"
								value={custoaquisicao ?? ""}
								onChange={(value) =>
									setValue("custoaquisicao", value, { shouldValidate: true })
								}
								aria-invalid={!!errors.custoaquisicao}
							/>
							<FieldError
								errors={errors.custoaquisicao ? [errors.custoaquisicao] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.tipo}>
							<FieldLabel htmlFor="tipo">Tipo Produto *</FieldLabel>
							<Select
								value={tipo}
								onValueChange={(value) =>
									setValue("tipo", value as ProdutoFormData["tipo"])
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione o tipo" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="P">Produto</SelectItem>
									<SelectItem value="S">Serviço</SelectItem>
								</SelectContent>
							</Select>
							<FieldError errors={errors.tipo ? [errors.tipo] : []} />
						</Field>

						<Field data-invalid={!!errors.iat}>
							<FieldLabel htmlFor="iat">IAT</FieldLabel>
							<Select
								value={iat || "none"}
								onValueChange={(value) =>
									setValue("iat", value === "none" ? null : (value as "A" | "T"))
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione o IAT" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Nenhum</SelectItem>
									<SelectItem value="A">Arredondamento</SelectItem>
									<SelectItem value="T">Truncamento</SelectItem>
								</SelectContent>
							</Select>
							<FieldError errors={errors.iat ? [errors.iat] : []} />
						</Field>

						<Field data-invalid={!!errors.ippt}>
							<FieldLabel htmlFor="ippt">IPPT *</FieldLabel>
							<Select
								value={ippt}
								onValueChange={(value) =>
									setValue("ippt", value as ProdutoFormData["ippt"])
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecione o IPPT" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="P">Produção própria</SelectItem>
									<SelectItem value="T">Produção por terceiros</SelectItem>
								</SelectContent>
							</Select>
							<FieldError errors={errors.ippt ? [errors.ippt] : []} />
						</Field>
					</div>

					<Field data-invalid={!!errors.observacoes}>
						<FieldLabel htmlFor="observacoes">Observação</FieldLabel>
						<Textarea
							id="observacoes"
							placeholder="Observações sobre o produto"
							aria-invalid={!!errors.observacoes}
							{...register("observacoes")}
						/>
						<FieldError
							errors={errors.observacoes ? [errors.observacoes] : []}
						/>
					</Field>
				</div>

				<div className="mt-6 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Field data-invalid={!!errors.quantidadepadrao}>
							<FieldLabel htmlFor="quantidadepadrao">
								Saldo em estoque
							</FieldLabel>
							<Input
								id="quantidadepadrao"
								type="number"
								min={0}
								step={1}
								placeholder="0"
								aria-invalid={!!errors.quantidadepadrao}
								{...register("quantidadepadrao", {
									valueAsNumber: true,
									setValueAs: (value) =>
										value === "" || value === null || value === undefined
											? null
											: Number(value),
								})}
							/>
							<FieldError
								errors={
									errors.quantidadepadrao ? [errors.quantidadepadrao] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.quantidademinima}>
							<FieldLabel htmlFor="quantidademinima">
								Quantidade mínima
							</FieldLabel>
							<Input
								id="quantidademinima"
								type="number"
								min={0}
								step={1}
								placeholder="Opcional"
								aria-invalid={!!errors.quantidademinima}
								{...register("quantidademinima", {
									valueAsNumber: true,
									setValueAs: (value) =>
										value === "" || value === null || value === undefined
											? null
											: Number(value),
								})}
							/>
							<FieldError
								errors={
									errors.quantidademinima ? [errors.quantidademinima] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.quantidademaxima}>
							<FieldLabel htmlFor="quantidademaxima">
								Quantidade máxima
							</FieldLabel>
							<Input
								id="quantidademaxima"
								type="number"
								min={1}
								step={1}
								placeholder="Opcional"
								aria-invalid={!!errors.quantidademaxima}
								{...register("quantidademaxima", {
									valueAsNumber: true,
									setValueAs: (value) =>
										value === "" || value === null || value === undefined
											? null
											: Number(value),
								})}
							/>
							<FieldError
								errors={
									errors.quantidademaxima ? [errors.quantidademaxima] : []
								}
							/>
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
						Produtos marcados aparecem na tela do garçom, desde que o grupo
						também esteja habilitado.
					</p>
				</div>
					</FieldGroup>
				</TabsContent>

				<TabsContent
					value="impostos"
					forceMount
					className="data-[state=inactive]:hidden"
				>
					<ProdutoAbaImpostos
						control={control}
						register={register}
						setValue={setValue}
						watch={watch}
						errors={errors}
					/>
				</TabsContent>
			</Tabs>

			<div className="flex justify-end gap-2 pt-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/produtos")}
					>
						Cancelar
					</Button>
					<Button type="submit" disabled={isPending || !empresa}>
						{isPending
							? "Salvando..."
							: isEdicao
								? "Salvar alterações"
								: "Cadastrar produto"}
					</Button>
			</div>
		</form>
	);
}
