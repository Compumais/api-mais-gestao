"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { Controller, type Resolver, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CampoCfopProduto } from "@/app/(auth)/produtos/components/campo-cfop-produto";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { OPCOES_TIPO_PRODUTO } from "@/constants/tipo-produto";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type AlterarProdutosEmMassaFormData,
	alterarProdutosEmMassaFormSchema,
	montarCamposAlteracaoEmMassa,
	valoresPadraoAlteracaoEmMassa,
} from "@/schemas/alterar-produtos-em-massa.schema";
import { cestService } from "@/services/cest.service";
import { hierarquiasService } from "@/services/hierarquias.service";
import { produtosService } from "@/services/produtos.service";
import {
	isUnidadeMedidaGlobal,
	unidadeMedidaService,
} from "@/services/unidade-medida.service";
import {
	OPCOES_CSOSN,
	OPCOES_CST_ICMS,
	OPCOES_CST_PIS_COFINS,
	type OpcaoCst,
} from "@/util/cst-produto-util";

const LIMITE_ALTERACAO_EM_MASSA = 500;

const OPCOES_ORIGEM = [
	{ value: "0", label: "0 - Nacional" },
	{ value: "1", label: "1 - Estrangeira (importação direta)" },
	{ value: "2", label: "2 - Estrangeira (adquirida no mercado interno)" },
	{ value: "3", label: "3 - Nacional (conteúdo importação > 40%)" },
	{ value: "4", label: "4 - Nacional (processos produtivos básicos)" },
	{ value: "5", label: "5 - Nacional (conteúdo importação ≤ 40%)" },
	{ value: "6", label: "6 - Estrangeira (importação direta, sem similar)" },
	{ value: "7", label: "7 - Estrangeira (mercado interno, sem similar)" },
	{ value: "8", label: "8 - Nacional (conteúdo importação > 70%)" },
];

type AlterarProdutosEmMassaDialogProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	ids: string[];
	onSucesso: () => void;
};

type LinhaCampoProps = {
	id: string;
	label: string;
	alterar: boolean;
	onAlterar: (valor: boolean) => void;
	children: ReactNode;
};

function LinhaCampo({
	id,
	label,
	alterar,
	onAlterar,
	children,
}: LinhaCampoProps) {
	return (
		<div className="grid gap-2 sm:grid-cols-[13rem_1fr] sm:items-center">
			<div className="flex items-center gap-2">
				<Checkbox
					id={`alterar-${id}`}
					checked={alterar}
					onCheckedChange={(checked) => onAlterar(checked === true)}
				/>
				<Label htmlFor={`alterar-${id}`}>{label}</Label>
			</div>
			<fieldset disabled={!alterar} className="min-w-0 disabled:opacity-50">
				{children}
			</fieldset>
		</div>
	);
}

function SelectCst({
	id,
	value,
	opcoes,
	onChange,
}: {
	id: string;
	value: string | null;
	opcoes: OpcaoCst[];
	onChange: (valor: string | null) => void;
}) {
	return (
		<Select
			value={value ?? "none"}
			onValueChange={(valor) => onChange(valor === "none" ? null : valor)}
		>
			<SelectTrigger id={id} className="w-full">
				<SelectValue placeholder="Selecione" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="none">Nenhum</SelectItem>
				{opcoes.map((opcao) => (
					<SelectItem key={opcao.value} value={opcao.value}>
						{opcao.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function AlterarProdutosEmMassaDialog({
	aberto,
	onAbertoChange,
	ids,
	onSucesso,
}: AlterarProdutosEmMassaDialogProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();

	const form = useForm<AlterarProdutosEmMassaFormData>({
		resolver: zodResolver(
			alterarProdutosEmMassaFormSchema,
		) as Resolver<AlterarProdutosEmMassaFormData>,
		defaultValues: valoresPadraoAlteracaoEmMassa,
	});

	const { control, handleSubmit, reset, setValue, register } = form;
	const valores = useWatch({ control });

	useEffect(() => {
		if (aberto) {
			reset(valoresPadraoAlteracaoEmMassa);
		}
	}, [aberto, reset]);

	const { data: grupos = [] } = useQuery({
		queryKey: ["hierarquias", empresa?.id, "todos"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return hierarquiasService.listarTodos({ idempresa: empresa.id });
		},
		enabled: aberto && !!empresa,
	});

	const { data: unidades = [] } = useQuery({
		queryKey: ["unidades-medida", empresa?.id, "todos"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return unidadeMedidaService.listarTodos({ idempresa: empresa.id });
		},
		enabled: aberto && !!empresa,
	});

	const { data: cests = [] } = useQuery({
		queryKey: ["cests", empresa?.id, "produto"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return cestService.listarTodos({ idempresa: empresa.id });
		},
		enabled: aberto && !!empresa,
	});

	const unidadesGlobais = unidades.filter((unidade) =>
		isUnidadeMedidaGlobal(unidade),
	);
	const unidadesEmpresa = unidades.filter(
		(unidade) => !isUnidadeMedidaGlobal(unidade),
	);

	const mutation = useMutation({
		mutationFn: produtosService.alterarEmMassa,
		onSuccess: async (resultado) => {
			await queryClient.invalidateQueries({ queryKey: ["produtos"] });
			toast.success(
				`${resultado.atualizados} produto(s) atualizado(s), ${resultado.erros} erro(s).`,
			);
			onAbertoChange(false);
			onSucesso();
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao alterar produtos em massa");
		},
	});

	const onSubmit = (dados: AlterarProdutosEmMassaFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		if (ids.length === 0) {
			toast.error("Selecione ao menos um produto");
			return;
		}

		if (ids.length > LIMITE_ALTERACAO_EM_MASSA) {
			toast.error(
				`É possível alterar no máximo ${LIMITE_ALTERACAO_EM_MASSA} produtos por vez`,
			);
			return;
		}

		const campos = montarCamposAlteracaoEmMassa(dados);
		if (Object.keys(campos).length === 0) {
			toast.error("Selecione ao menos um campo para alterar");
			return;
		}

		mutation.mutate({
			idempresa: empresa.id,
			ids,
			campos,
		});
	};

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Alterar em massa</DialogTitle>
					<DialogDescription>
						{ids.length} produto(s) selecionado(s). Marque os campos que deseja
						alterar; os demais não serão tocados.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex min-h-0 flex-1 flex-col gap-4"
				>
					<div className="flex-1 space-y-6 overflow-y-auto pr-1">
						<section className="space-y-3">
							<h3 className="text-sm font-semibold">Dados</h3>
							<LinhaCampo
								id="idgrupo"
								label="Grupo"
								alterar={valores.idgrupo?.alterar ?? false}
								onAlterar={(alterar) => setValue("idgrupo.alterar", alterar)}
							>
								<Controller
									name="idgrupo.valor"
									control={control}
									render={({ field }) => (
										<Combobox
											options={grupos.map((grupo) => ({
												value: grupo.id,
												label: grupo.nome || grupo.codigo || grupo.id,
											}))}
											value={field.value ?? ""}
											onChange={(valor) => field.onChange(valor || null)}
											placeholder="Selecione o grupo"
											searchPlaceholder="Buscar grupo..."
											emptyMessage="Nenhum grupo encontrado"
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="idunidademedida"
								label="Unidade"
								alterar={valores.idunidademedida?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("idunidademedida.alterar", alterar)
								}
							>
								<Controller
									name="idunidademedida.valor"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value ?? undefined}
											onValueChange={field.onChange}
										>
											<SelectTrigger id="idunidademedida" className="w-full">
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
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="preco"
								label="Preço"
								alterar={valores.preco?.alterar ?? false}
								onAlterar={(alterar) => setValue("preco.alterar", alterar)}
							>
								<Controller
									name="preco.valor"
									control={control}
									render={({ field }) => (
										<MoneyInput
											id="preco"
											value={field.value}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="custoaquisicao"
								label="Custo"
								alterar={valores.custoaquisicao?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("custoaquisicao.alterar", alterar)
								}
							>
								<Controller
									name="custoaquisicao.valor"
									control={control}
									render={({ field }) => (
										<MoneyInput
											id="custoaquisicao"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="origem"
								label="Origem"
								alterar={valores.origem?.alterar ?? false}
								onAlterar={(alterar) => setValue("origem.alterar", alterar)}
							>
								<Controller
									name="origem.valor"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value?.toString()}
											onValueChange={(valor) => field.onChange(Number(valor))}
										>
											<SelectTrigger id="origem" className="w-full">
												<SelectValue placeholder="Selecione a origem" />
											</SelectTrigger>
											<SelectContent>
												{OPCOES_ORIGEM.map((opcao) => (
													<SelectItem key={opcao.value} value={opcao.value}>
														{opcao.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="ncm"
								label="NCM"
								alterar={valores.ncm?.alterar ?? false}
								onAlterar={(alterar) => setValue("ncm.alterar", alterar)}
							>
								<Input
									id="ncm"
									maxLength={10}
									placeholder="Ex.: 22021000"
									{...register("ncm.valor")}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="idcest"
								label="CEST"
								alterar={valores.idcest?.alterar ?? false}
								onAlterar={(alterar) => setValue("idcest.alterar", alterar)}
							>
								<Controller
									name="idcest.valor"
									control={control}
									render={({ field }) => (
										<Combobox
											options={cests.map((cest) => ({
												value: cest.id,
												label: `${cest.codigo} - ${cest.descricao}`,
											}))}
											value={field.value ?? ""}
											onChange={(valor) => field.onChange(valor || null)}
											placeholder="Selecione o CEST"
											searchPlaceholder="Buscar CEST..."
											emptyMessage="Nenhum CEST encontrado"
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="ippt"
								label="IPPT"
								alterar={valores.ippt?.alterar ?? false}
								onAlterar={(alterar) => setValue("ippt.alterar", alterar)}
							>
								<Controller
									name="ippt.valor"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value ?? undefined}
											onValueChange={field.onChange}
										>
											<SelectTrigger id="ippt" className="w-full">
												<SelectValue placeholder="Selecione o IPPT" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="P">Produção própria</SelectItem>
												<SelectItem value="T">
													Produção por terceiros
												</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="inativo"
								label="Situação"
								alterar={valores.inativo?.alterar ?? false}
								onAlterar={(alterar) => setValue("inativo.alterar", alterar)}
							>
								<Controller
									name="inativo.valor"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value?.toString()}
											onValueChange={(valor) => field.onChange(Number(valor))}
										>
											<SelectTrigger id="inativo" className="w-full">
												<SelectValue placeholder="Selecione" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="0">Ativo</SelectItem>
												<SelectItem value="1">Inativo</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="controlalote"
								label="Controla lote"
								alterar={valores.controlalote?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("controlalote.alterar", alterar)
								}
							>
								<Controller
									name="controlalote.valor"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value?.toString()}
											onValueChange={(valor) => field.onChange(Number(valor))}
										>
											<SelectTrigger id="controlalote" className="w-full">
												<SelectValue placeholder="Selecione" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="0">Não</SelectItem>
												<SelectItem value="1">Sim</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="controlavalidade"
								label="Controla validade"
								alterar={valores.controlavalidade?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("controlavalidade.alterar", alterar)
								}
							>
								<Controller
									name="controlavalidade.valor"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value?.toString()}
											onValueChange={(valor) => field.onChange(Number(valor))}
										>
											<SelectTrigger id="controlavalidade" className="w-full">
												<SelectValue placeholder="Selecione" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="0">Não</SelectItem>
												<SelectItem value="1">Sim</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</LinhaCampo>
						</section>

						<section className="space-y-3">
							<h3 className="text-sm font-semibold">Impostos</h3>
							<LinhaCampo
								id="percentualmva"
								label="MVA (%)"
								alterar={valores.percentualmva?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("percentualmva.alterar", alterar)
								}
							>
								<Input
									id="percentualmva"
									placeholder="Ex.: 18,00"
									inputMode="decimal"
									{...register("percentualmva.valor")}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="idcfopentrada"
								label="CFOP entrada"
								alterar={valores.idcfopentrada?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("idcfopentrada.alterar", alterar)
								}
							>
								<Controller
									name="idcfopentrada.valor"
									control={control}
									render={({ field }) => (
										<CampoCfopProduto
											id="idcfopentrada"
											label="CFOP de entrada"
											value={field.value}
											tipomovimento="E"
											ocultarRotulo
											onChange={(valor) => field.onChange(valor || null)}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="idcfopsaida"
								label="CFOP NF saída"
								alterar={valores.idcfopsaida?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("idcfopsaida.alterar", alterar)
								}
							>
								<Controller
									name="idcfopsaida.valor"
									control={control}
									render={({ field }) => (
										<CampoCfopProduto
											id="idcfopsaida"
											label="CFOP NF (saída)"
											value={field.value}
											tipomovimento="S"
											ocultarRotulo
											onChange={(valor) => field.onChange(valor || null)}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="idcfopsaidanfce"
								label="CFOP NFC-e"
								alterar={valores.idcfopsaidanfce?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("idcfopsaidanfce.alterar", alterar)
								}
							>
								<Controller
									name="idcfopsaidanfce.valor"
									control={control}
									render={({ field }) => (
										<CampoCfopProduto
											id="idcfopsaidanfce"
											label="CFOP ECF (NFC-e)"
											value={field.value}
											tipomovimento="S"
											ocultarRotulo
											onChange={(valor) => field.onChange(valor || null)}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="tipoproduto"
								label="Tipo de produto"
								alterar={valores.tipoproduto?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("tipoproduto.alterar", alterar)
								}
							>
								<Controller
									name="tipoproduto.valor"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value ?? "none"}
											onValueChange={(valor) =>
												field.onChange(valor === "none" ? null : valor)
											}
										>
											<SelectTrigger id="tipoproduto" className="w-full">
												<SelectValue placeholder="Selecione o tipo" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">Não informado</SelectItem>
												{OPCOES_TIPO_PRODUTO.map((opcao) => (
													<SelectItem key={opcao.value} value={opcao.value}>
														{opcao.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="situacaotributariasnentrada"
								label="CST/CSOSN entrada"
								alterar={valores.situacaotributariasnentrada?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("situacaotributariasnentrada.alterar", alterar)
								}
							>
								<Input
									id="situacaotributariasnentrada"
									placeholder="Ex.: 102 ou 00"
									maxLength={3}
									{...register("situacaotributariasnentrada.valor")}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="situacaotributaria"
								label="CST ICMS saída NF"
								alterar={valores.situacaotributaria?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("situacaotributaria.alterar", alterar)
								}
							>
								<Controller
									name="situacaotributaria.valor"
									control={control}
									render={({ field }) => (
										<SelectCst
											id="situacaotributaria"
											value={field.value}
											opcoes={OPCOES_CST_ICMS}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="situacaotributariasn"
								label="CSOSN saída NF"
								alterar={valores.situacaotributariasn?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("situacaotributariasn.alterar", alterar)
								}
							>
								<Controller
									name="situacaotributariasn.valor"
									control={control}
									render={({ field }) => (
										<SelectCst
											id="situacaotributariasn"
											value={field.value}
											opcoes={OPCOES_CSOSN}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="tributacaoespecial"
								label="CST ICMS NFC-e"
								alterar={valores.tributacaoespecial?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("tributacaoespecial.alterar", alterar)
								}
							>
								<Controller
									name="tributacaoespecial.valor"
									control={control}
									render={({ field }) => (
										<SelectCst
											id="tributacaoespecial"
											value={field.value}
											opcoes={OPCOES_CST_ICMS}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="tributacaosn"
								label="CSOSN NFC-e"
								alterar={valores.tributacaosn?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("tributacaosn.alterar", alterar)
								}
							>
								<Controller
									name="tributacaosn.valor"
									control={control}
									render={({ field }) => (
										<SelectCst
											id="tributacaosn"
											value={field.value}
											opcoes={OPCOES_CSOSN}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="cstipientrada"
								label="CST IPI entrada"
								alterar={valores.cstipientrada?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("cstipientrada.alterar", alterar)
								}
							>
								<Input
									id="cstipientrada"
									placeholder="Ex.: 00"
									maxLength={3}
									{...register("cstipientrada.valor")}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="cstipisaida"
								label="CST IPI saída"
								alterar={valores.cstipisaida?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("cstipisaida.alterar", alterar)
								}
							>
								<Input
									id="cstipisaida"
									placeholder="Ex.: 50"
									maxLength={3}
									{...register("cstipisaida.valor")}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="cstpisentrada"
								label="CST PIS entrada"
								alterar={valores.cstpisentrada?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("cstpisentrada.alterar", alterar)
								}
							>
								<Controller
									name="cstpisentrada.valor"
									control={control}
									render={({ field }) => (
										<SelectCst
											id="cstpisentrada"
											value={field.value}
											opcoes={OPCOES_CST_PIS_COFINS}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="cstcofinsentrada"
								label="CST COFINS entrada"
								alterar={valores.cstcofinsentrada?.alterar ?? false}
								onAlterar={(alterar) =>
									setValue("cstcofinsentrada.alterar", alterar)
								}
							>
								<Controller
									name="cstcofinsentrada.valor"
									control={control}
									render={({ field }) => (
										<SelectCst
											id="cstcofinsentrada"
											value={field.value}
											opcoes={OPCOES_CST_PIS_COFINS}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="cstpis"
								label="CST PIS saída"
								alterar={valores.cstpis?.alterar ?? false}
								onAlterar={(alterar) => setValue("cstpis.alterar", alterar)}
							>
								<Controller
									name="cstpis.valor"
									control={control}
									render={({ field }) => (
										<SelectCst
											id="cstpis"
											value={field.value}
											opcoes={OPCOES_CST_PIS_COFINS}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
							<LinhaCampo
								id="cstcofins"
								label="CST COFINS saída"
								alterar={valores.cstcofins?.alterar ?? false}
								onAlterar={(alterar) => setValue("cstcofins.alterar", alterar)}
							>
								<Controller
									name="cstcofins.valor"
									control={control}
									render={({ field }) => (
										<SelectCst
											id="cstcofins"
											value={field.value}
											opcoes={OPCOES_CST_PIS_COFINS}
											onChange={field.onChange}
										/>
									)}
								/>
							</LinhaCampo>
						</section>

						<section className="space-y-3">
							<h3 className="text-sm font-semibold">Alíquotas</h3>
							{(
								[
									["aliquotaicmsinterna", "ICMS interna"],
									[
										"aliquotaicmsdiferencialentrada",
										"ICMS diferencial (entrada)",
									],
									["aliquotareducaoicmsnfcesat", "Redução ICMS NFC-e/SAT"],
									["aliquotafcpnf", "FCP NF"],
									["ultimaaliquotaicmsst", "Última alíquota ICMS ST"],
									["ultimaaliquotafcpst", "Última alíquota FCP ST"],
									["aliquotapis", "PIS saída"],
									["aliquotapisentrada", "PIS entrada"],
									["aliquotacofins", "COFINS saída"],
									["aliquotaconfinsentrada", "COFINS entrada"],
									["aliquotapisconfinssaidapreco", "PIS/COFINS saída (preço)"],
									[
										"aliquotapisconfinsentradapreco",
										"PIS/COFINS entrada (preço)",
									],
								] as const
							).map(([chave, label]) => (
								<LinhaCampo
									key={chave}
									id={chave}
									label={label}
									alterar={valores[chave]?.alterar ?? false}
									onAlterar={(alterar) => setValue(`${chave}.alterar`, alterar)}
								>
									<Input
										id={chave}
										placeholder="Ex.: 18,00"
										inputMode="decimal"
										{...register(`${chave}.valor`)}
									/>
								</LinhaCampo>
							))}
						</section>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onAbertoChange(false)}
							disabled={mutation.isPending}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={mutation.isPending || ids.length === 0}
						>
							{mutation.isPending ? "Aplicando..." : "Aplicar alteração"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
