"use client";



import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type ItemImportacaoFormData,
	itemImportacaoSchema,
} from "@/schemas/nota-fiscal.schema";
import { hierarquiasService } from "@/services/hierarquias.service";
import {
	notaFiscalService,
	type DadosImportacaoItem,
	type NotaFiscalItemImportacao,
} from "@/services/nota-fiscal.service";
import { CampoCfopImportacao } from "./campo-cfop-importacao";
import { CampoUnidadeMedidaImportacao } from "./campo-unidade-medida-importacao";



type ModalItemImportacaoProps = {

	idempresa: string;

	idRascunho: string;

	item: NotaFiscalItemImportacao;

	aberto: boolean;

	onAbertoChange: (aberto: boolean) => void;

};



function calcularConversao(

	quantidadeXml: string,

	precounitarioXml: string,

	fator: string,

) {

	const qtd = parseFloat(quantidadeXml) || 0;

	const preco = parseFloat(precounitarioXml) || 0;

	const f = parseFloat(fator) || 1;

	return {

		quantidadeEstoque: (qtd * f).toString(),

		precounitarioEstoque: f !== 0 ? (preco / f).toString() : preco.toString(),

	};

}



function montarDefaultValues(

	item: NotaFiscalItemImportacao,

	dados: DadosImportacaoItem,

): ItemImportacaoFormData {

	const trib = dados.tributacao;

	return {
		descricaoFornecedor:
			dados.descricaoFornecedor ?? item.descricao ?? "",
		fatorConversao: dados.fatorConversao ?? "1",
		quantidadeEstoque: dados.quantidadeEstoque ?? item.quantidade ?? "0",
		precounitarioEstoque:
			dados.precounitarioEstoque ?? item.precounitario ?? "0",
		precoVenda: dados.precoVenda ?? "",
		idcfop: dados.idcfop ?? "",
		cfopXml: dados.cfopXml ?? item.cfop ?? "",
		ncmXml: dados.ncmXml ?? item.ncm ?? "",
		idncm: dados.idncm ?? "",
		eanXml: dados.eanXml ?? "",
		idgrupo: dados.idgrupo ?? "",
		idunidademedida: dados.idunidademedida ?? "",
		unidadeEstoque: dados.unidadeEstoque ?? "",
		origem: trib.origem !== undefined ? String(trib.origem) : "",

		situacaotributaria: trib.situacaotributaria ?? "",

		baseicms: trib.baseicms ?? "",

		percentualicms: trib.percentualicms ?? "",

		valoricms: trib.icms ?? "",

		cstpis: trib.cstpis ?? "",

		aliquotapis: trib.aliquotapis ?? "",

		valorpis: trib.pis ?? "",

		cstcofins: trib.cstcofins ?? "",

		aliquotacofins: trib.aliquotacofins ?? "",

		valorcofins: trib.cofins ?? "",

		ipi: trib.ipi ?? "",

	};

}



export function ModalItemImportacao({

	idempresa,

	idRascunho,

	item,

	aberto,

	onAbertoChange,

}: ModalItemImportacaoProps) {

	const queryClient = useQueryClient();

	const dados = item.dadosimportacao;



	const form = useForm<ItemImportacaoFormData>({

		resolver: zodResolver(itemImportacaoSchema),

		defaultValues: dados

			? montarDefaultValues(item, dados)

			: undefined,

	});



	const {
		register,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { errors },
	} = form;
	const fatorConversao = watch("fatorConversao");
	const statusVinculo = dados?.statusVinculo;
	const precisaDadosProduto =
		statusVinculo === "novo" || statusVinculo === "pendente";

	const {
		data: grupos = [],
		isLoading: carregandoGrupos,
		isError: erroGrupos,
	} = useQuery({
		queryKey: ["hierarquias", idempresa, "importacao-nf"],
		queryFn: () => hierarquiasService.listarTodos({ idempresa }),
		enabled: aberto && !!idempresa,
	});

	useEffect(() => {

		if (dados && aberto) {

			reset(montarDefaultValues(item, dados));

		}

	}, [dados, item, aberto, reset]);



	useEffect(() => {

		if (!dados) return;

		const { quantidadeEstoque, precounitarioEstoque } = calcularConversao(

			dados.quantidadeXml,

			dados.precounitarioXml,

			fatorConversao,

		);

		setValue("quantidadeEstoque", quantidadeEstoque);

		setValue("precounitarioEstoque", precounitarioEstoque);

	}, [fatorConversao, dados, setValue]);



	const { mutate: salvar, isPending } = useMutation({

		mutationFn: (formData: ItemImportacaoFormData) => {
			if (!dados) {
				return Promise.reject(new Error("Dados de importação indisponíveis"));
			}

			if (statusVinculo === "novo" && !formData.idgrupo) {
				return Promise.reject(new Error("Informe o grupo do produto"));
			}

			if (statusVinculo === "novo" && !formData.idunidademedida) {
				return Promise.reject(
					new Error("Informe a unidade de medida do produto"),
				);
			}

			const origemNum =

				formData.origem !== undefined && formData.origem !== ""

					? parseInt(formData.origem, 10)

					: undefined;



			const payload: Partial<DadosImportacaoItem> = {
				descricaoFornecedor: formData.descricaoFornecedor.trim(),
				fatorConversao: formData.fatorConversao,
				quantidadeEstoque: formData.quantidadeEstoque,
				precounitarioEstoque: formData.precounitarioEstoque,
				precoVenda: formData.precoVenda,
				idcfop: formData.idcfop || undefined,
				cfopXml: formData.cfopXml,
				ncmXml: formData.ncmXml,
				idncm: formData.idncm || undefined,
				eanXml: formData.eanXml || dados.eanXml,
				idgrupo: formData.idgrupo || undefined,
				idunidademedida: formData.idunidademedida || undefined,
				unidadeEstoque: formData.unidadeEstoque || undefined,
				tributacao: {

					situacaotributaria: formData.situacaotributaria,

					baseicms: formData.baseicms,

					percentualicms: formData.percentualicms,

					icms: formData.valoricms,

					cstpis: formData.cstpis,

					aliquotapis: formData.aliquotapis,

					pis: formData.valorpis,

					cstcofins: formData.cstcofins,

					aliquotacofins: formData.aliquotacofins,

					cofins: formData.valorcofins,

					ipi: formData.ipi,

					origem: Number.isNaN(origemNum ?? NaN) ? undefined : origemNum,

				},

			};



			return notaFiscalService.atualizarItemRascunhoImportacao(

				idRascunho,

				item.id,

				{ idempresa, ...payload },

			);

		},

		onSuccess: () => {

			toast.success("Item atualizado");

			queryClient.invalidateQueries({

				queryKey: ["rascunho-importacao-nf", idRascunho],

			});

			onAbertoChange(false);

		},

		onError: (error: Error) => toast.error(error.message),

	});



	if (!dados) return null;



	return (

		<Dialog open={aberto} onOpenChange={onAbertoChange}>

			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">

				<DialogHeader>

					<DialogTitle>Lançamento do produto</DialogTitle>

				</DialogHeader>

				<form

					onSubmit={handleSubmit((formData) => salvar(formData))}

					className="flex flex-col gap-4"

				>

					<Field data-invalid={!!errors.descricaoFornecedor}>
						<FieldLabel htmlFor="descricaoFornecedor">Nome do produto</FieldLabel>
						<Input
							id="descricaoFornecedor"
							maxLength={120}
							placeholder="Nome que será cadastrado no estoque"
							{...register("descricaoFornecedor")}
						/>
						{dados.descricaoFornecedor &&
						watch("descricaoFornecedor") !== dados.descricaoFornecedor ? (
							<p className="text-xs text-muted-foreground mt-1">
								Original na NF: {dados.descricaoFornecedor}
							</p>
						) : null}
						{errors.descricaoFornecedor ? (
							<p className="text-xs text-destructive mt-1">
								{errors.descricaoFornecedor.message}
							</p>
						) : null}
					</Field>
					{dados.eanXml ? (
						<p className="text-sm text-muted-foreground">
							Código de barras (XML): <span className="font-mono">{dados.eanXml}</span>
						</p>
					) : null}
					<p className="text-xs text-muted-foreground">
						Unidade NF: {dados.unidadeXml ?? "-"} | Qtd. NF: {dados.quantidadeXml} |
						Preço NF: {dados.precounitarioXml}
					</p>

					<Tabs defaultValue="compra">

						<TabsList>

							<TabsTrigger value="compra">Compra</TabsTrigger>

							<TabsTrigger value="tributacao">Tributação</TabsTrigger>

						</TabsList>



						<TabsContent value="compra" className="mt-4">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="fatorConversao">
										Fator de conversão
									</FieldLabel>
									<Input id="fatorConversao" {...register("fatorConversao")} />
									<p className="text-xs text-muted-foreground mt-1">
										Relaciona a unidade da nota com a unidade de estoque. Ex.: caixa
										com 12 unidades → fator 12. Qtd. estoque = qtd. NF × fator.
										Preço estoque = preço NF ÷ fator.
									</p>
								</Field>
								<div className="grid grid-cols-2 gap-3">
									<Field>
										<FieldLabel htmlFor="quantidadeEstoque">
											Qtd. estoque (calculada)
										</FieldLabel>
										<Input
											id="quantidadeEstoque"
											readOnly
											{...register("quantidadeEstoque")}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="precounitarioEstoque">
											Preço custo estoque (calculado)
										</FieldLabel>
										<Input
											id="precounitarioEstoque"
											readOnly
											{...register("precounitarioEstoque")}
										/>
									</Field>
								</div>
								<Field>
									<FieldLabel htmlFor="precoVenda">Preço de venda</FieldLabel>
									<Input id="precoVenda" {...register("precoVenda")} />
								</Field>
								<Field>
									<FieldLabel htmlFor="idgrupo">Grupo do produto{precisaDadosProduto ? " *" : ""}</FieldLabel>
									<Select
										value={watch("idgrupo") || undefined}
										onValueChange={(value) => setValue("idgrupo", value, { shouldDirty: true })}
										disabled={carregandoGrupos}
									>
										<SelectTrigger id="idgrupo" className="w-full">
											<SelectValue
												placeholder={
													carregandoGrupos
														? "Carregando grupos..."
														: "Selecione o grupo"
												}
											/>
										</SelectTrigger>
										<SelectContent position="popper" className="z-[200]">
											{grupos.length === 0 ? (
												<SelectItem value="__vazio" disabled>
													{erroGrupos
														? "Erro ao carregar grupos"
														: "Nenhum grupo cadastrado"}
												</SelectItem>
											) : (
												grupos.map((grupo) => (
													<SelectItem key={grupo.id} value={grupo.id}>
														{grupo.nome || grupo.codigo || grupo.id}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>
									{precisaDadosProduto && statusVinculo === "pendente" ? (
										<p className="text-xs text-muted-foreground mt-1">
											Obrigatório ao marcar o item como cadastro novo.
										</p>
									) : null}
								</Field>
								<CampoUnidadeMedidaImportacao
									idempresa={idempresa}
									habilitado={aberto}
									value={watch("idunidademedida")}
									codigoXml={dados.unidadeXml}
									obrigatorio={statusVinculo === "novo"}
									onChange={(id, codigo) => {
										setValue("idunidademedida", id, { shouldDirty: true });
										if (codigo) {
											setValue("unidadeEstoque", codigo, { shouldDirty: true });
										}
									}}
								/>
								<CampoCfopImportacao
									id="idcfop-item"
									label="CFOP de entrada"
									value={watch("idcfop")}
									codigoXml={watch("cfopXml")}
									onChange={(idcfop, codigo) => {
										setValue("idcfop", idcfop, { shouldDirty: true });
										if (codigo) {
											setValue("cfopXml", codigo, { shouldDirty: true });
										}
									}}
								/>
								<p className="text-xs text-muted-foreground -mt-2">
									Pré-preenchido com o CFOP do XML. Você pode alterar conforme a
									parametrização fiscal da empresa.
								</p>
								<Field>
									<FieldLabel htmlFor="ncmXml">NCM</FieldLabel>
									<Input id="ncmXml" {...register("ncmXml")} />
								</Field>
							</FieldGroup>

						</TabsContent>



						<TabsContent value="tributacao" className="mt-4">

							<FieldGroup>

								<div className="grid grid-cols-2 gap-3">

									<Field>

										<FieldLabel htmlFor="origem">Origem</FieldLabel>

										<Input id="origem" {...register("origem")} />

									</Field>

									<Field>

										<FieldLabel htmlFor="situacaotributaria">

											CST ICMS

										</FieldLabel>

										<Input

											id="situacaotributaria"

											{...register("situacaotributaria")}

										/>

									</Field>

								</div>



								<h4 className="text-sm font-semibold">ICMS</h4>

								<div className="grid grid-cols-3 gap-3">

									<Field>

										<FieldLabel htmlFor="baseicms">Base ICMS</FieldLabel>

										<Input id="baseicms" {...register("baseicms")} />

									</Field>

									<Field>

										<FieldLabel htmlFor="percentualicms">% ICMS</FieldLabel>

										<Input id="percentualicms" {...register("percentualicms")} />

									</Field>

									<Field>

										<FieldLabel htmlFor="valoricms">Valor ICMS</FieldLabel>

										<Input id="valoricms" {...register("valoricms")} />

									</Field>

								</div>



								<h4 className="text-sm font-semibold">PIS</h4>

								<div className="grid grid-cols-3 gap-3">

									<Field>

										<FieldLabel htmlFor="cstpis">CST PIS</FieldLabel>

										<Input id="cstpis" {...register("cstpis")} />

									</Field>

									<Field>

										<FieldLabel htmlFor="aliquotapis">% PIS</FieldLabel>

										<Input id="aliquotapis" {...register("aliquotapis")} />

									</Field>

									<Field>

										<FieldLabel htmlFor="valorpis">Valor PIS</FieldLabel>

										<Input id="valorpis" {...register("valorpis")} />

									</Field>

								</div>



								<h4 className="text-sm font-semibold">COFINS</h4>

								<div className="grid grid-cols-3 gap-3">

									<Field>

										<FieldLabel htmlFor="cstcofins">CST COFINS</FieldLabel>

										<Input id="cstcofins" {...register("cstcofins")} />

									</Field>

									<Field>

										<FieldLabel htmlFor="aliquotacofins">% COFINS</FieldLabel>

										<Input id="aliquotacofins" {...register("aliquotacofins")} />

									</Field>

									<Field>

										<FieldLabel htmlFor="valorcofins">Valor COFINS</FieldLabel>

										<Input id="valorcofins" {...register("valorcofins")} />

									</Field>

								</div>



								<h4 className="text-sm font-semibold">IPI</h4>

								<Field>

									<FieldLabel htmlFor="ipi">Valor IPI</FieldLabel>

									<Input id="ipi" {...register("ipi")} />

								</Field>

							</FieldGroup>

						</TabsContent>

					</Tabs>



					<DialogFooter>

						<Button

							type="button"

							variant="outline"

							onClick={() => onAbertoChange(false)}

						>

							Cancelar

						</Button>

						<Button type="submit" disabled={isPending}>

							{isPending ? "Salvando..." : "Salvar item"}

						</Button>

					</DialogFooter>

				</form>

			</DialogContent>

		</Dialog>

	);

}


