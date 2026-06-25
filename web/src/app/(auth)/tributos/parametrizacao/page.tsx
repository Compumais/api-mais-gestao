"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CampoCfopProduto } from "@/app/(auth)/produtos/components/campo-cfop-produto";
import { TableSkeleton } from "@/components/table-skeleton";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type ParametrizacaoTributosFormData,
	parametrizacaoTributosFormSchema,
} from "@/schemas/parametrizacao-tributos.schema";
import {
	type ParametrizacaoTributos,
	parametrizacaoTributosService,
} from "@/services/parametrizacao-tributos.service";
import { OPCOES_CSOSN, OPCOES_CST_ICMS } from "@/util/cst-produto-util";
import { PainelFluxoTributacaoImportacao } from "../components/painel-fluxo-tributacao-importacao";

const VALORES_PADRAO: ParametrizacaoTributosFormData = {
	codigocfopentrada: "",
	cstentrada: null,
	csosnentrada: null,
	ncm: null,
	taxaicmsentrada: null,
	uf: null,
	ignorarprimeirodigitocst: false,
	idcfopsaidanfe: null,
	cstnfe: null,
	csosnnfe: null,
	taxaicmsnfe: null,
	idcfopsaidanfce: null,
	cstnfce: null,
	csosnnfce: null,
	taxaicmsnfce: null,
	aliquotapis: null,
	cstpis: null,
	aliquotacofins: null,
	cstcofins: null,
	cstipi: null,
	idenquadramentoipi: null,
	percentualmva: null,
	percentualirrf: null,
};

function textoOuNulo(valor?: string | null): string | null {
	const texto = valor?.trim();
	return texto ? texto : null;
}

function mapRegistroParaForm(
	registro: ParametrizacaoTributos,
): ParametrizacaoTributosFormData {
	return {
		codigocfopentrada: registro.codigocfopentrada ?? "",
		cstentrada: registro.cstentrada,
		csosnentrada: registro.csosnentrada,
		ncm: registro.ncm,
		taxaicmsentrada: registro.taxaicmsentrada,
		uf: registro.uf,
		ignorarprimeirodigitocst: registro.ignorarprimeirodigitocst === 1,
		idcfopsaidanfe: registro.idcfopsaidanfe,
		cstnfe: registro.cstnfe,
		csosnnfe: registro.csosnnfe,
		taxaicmsnfe: registro.taxaicmsnfe,
		idcfopsaidanfce: registro.idcfopsaidanfce,
		cstnfce: registro.cstnfce,
		csosnnfce: registro.csosnnfce,
		taxaicmsnfce: registro.taxaicmsnfce,
		aliquotapis: registro.aliquotapis,
		cstpis: registro.cstpis,
		aliquotacofins: registro.aliquotacofins,
		cstcofins: registro.cstcofins,
		cstipi: registro.cstipi,
		idenquadramentoipi: registro.idenquadramentoipi,
		percentualmva: registro.percentualmva,
		percentualirrf: registro.percentualirrf,
	};
}

function mapFormParaPayload(
	dados: ParametrizacaoTributosFormData,
	idempresa: string,
) {
	return {
		idempresa,
		codigocfopentrada: dados.codigocfopentrada.trim(),
		cstentrada: textoOuNulo(dados.cstentrada),
		csosnentrada: textoOuNulo(dados.csosnentrada),
		ncm: textoOuNulo(dados.ncm),
		taxaicmsentrada: textoOuNulo(dados.taxaicmsentrada),
		uf: textoOuNulo(dados.uf)?.toUpperCase() ?? null,
		ignorarprimeirodigitocst: dados.ignorarprimeirodigitocst ? 1 : 0,
		idcfopsaidanfe: dados.idcfopsaidanfe ?? null,
		cstnfe: textoOuNulo(dados.cstnfe),
		csosnnfe: textoOuNulo(dados.csosnnfe),
		taxaicmsnfe: textoOuNulo(dados.taxaicmsnfe),
		idcfopsaidanfce: dados.idcfopsaidanfce ?? null,
		cstnfce: textoOuNulo(dados.cstnfce),
		csosnnfce: textoOuNulo(dados.csosnnfce),
		taxaicmsnfce: textoOuNulo(dados.taxaicmsnfce),
		aliquotapis: textoOuNulo(dados.aliquotapis),
		cstpis: textoOuNulo(dados.cstpis),
		aliquotacofins: textoOuNulo(dados.aliquotacofins),
		cstcofins: textoOuNulo(dados.cstcofins),
		cstipi: textoOuNulo(dados.cstipi),
		idenquadramentoipi: dados.idenquadramentoipi ?? null,
		percentualmva: textoOuNulo(dados.percentualmva),
		percentualirrf: textoOuNulo(dados.percentualirrf),
	};
}

export default function ParametrizacaoTributosPage() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [pagina, setPagina] = useState(1);
	const [busca, setBusca] = useState("");
	const [registroEdicao, setRegistroEdicao] =
		useState<ParametrizacaoTributos | null>(null);

	const form = useForm<ParametrizacaoTributosFormData>({
		resolver: zodResolver(parametrizacaoTributosFormSchema),
		defaultValues: VALORES_PADRAO,
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = form;

	const idcfopsaidanfe = watch("idcfopsaidanfe");
	const idcfopsaidanfce = watch("idcfopsaidanfce");
	const ignorarprimeirodigitocst = watch("ignorarprimeirodigitocst");

	const { data, isLoading } = useQuery({
		queryKey: ["parametrizacao-tributos", empresa?.id, pagina, busca],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return parametrizacaoTributosService.listar({
				idempresa: empresa.id,
				page: pagina,
				limit: 10,
				busca: busca || undefined,
			});
		},
		enabled: !!empresa,
	});

	useEffect(() => {
		if (registroEdicao) {
			reset(mapRegistroParaForm(registroEdicao));
			return;
		}
		reset(VALORES_PADRAO);
	}, [registroEdicao, reset]);

	const salvarMutation = useMutation({
		mutationFn: async (dados: ParametrizacaoTributosFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const payload = mapFormParaPayload(dados, empresa.id);

			if (registroEdicao) {
				return parametrizacaoTributosService.atualizar(
					registroEdicao.id,
					payload,
				);
			}

			return parametrizacaoTributosService.criar(payload);
		},
		onSuccess: () => {
			toast.success(
				registroEdicao
					? "Parametrização atualizada com sucesso"
					: "Parametrização criada com sucesso",
			);
			setRegistroEdicao(null);
			reset(VALORES_PADRAO);
			queryClient.invalidateQueries({
				queryKey: ["parametrizacao-tributos", empresa?.id],
			});
		},
		onError: () => {
			toast.error("Não foi possível salvar a parametrização");
		},
	});

	const excluirMutation = useMutation({
		mutationFn: async (id: string) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			await parametrizacaoTributosService.excluir(id, empresa.id);
		},
		onSuccess: () => {
			toast.success("Parametrização excluída");
			if (registroEdicao) {
				setRegistroEdicao(null);
				reset(VALORES_PADRAO);
			}
			queryClient.invalidateQueries({
				queryKey: ["parametrizacao-tributos", empresa?.id],
			});
		},
		onError: () => {
			toast.error("Não foi possível excluir a parametrização");
		},
	});

	const onSubmit = (dados: ParametrizacaoTributosFormData) => {
		salvarMutation.mutate(dados);
	};

	const novoRegistro = () => {
		setRegistroEdicao(null);
		reset(VALORES_PADRAO);
	};

	if (!empresa) {
		return (
			<div className="px-4">
				<p className="text-muted-foreground text-sm">
					Selecione uma empresa para gerenciar a parametrização de tributos.
				</p>
			</div>
		);
	}

	const registros = data?.data ?? [];
	const paginacao = data?.paginacao;

	return (
		<main className="px-4 space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold">Parametrização de tributos</h1>
					<p className="text-muted-foreground text-sm">
						Regras de tributação de saída aplicadas automaticamente na
						importação de NF de compra.
					</p>
				</div>
				<Button type="button" onClick={novoRegistro}>
					<IconPlus className="mr-2 h-4 w-4" aria-hidden="true" />
					Nova regra
				</Button>
			</header>

			<PainelFluxoTributacaoImportacao variante="parametrizacao" />

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Input
					placeholder="Buscar por CFOP, NCM ou CST..."
					value={busca}
					onChange={(evento) => {
						setBusca(evento.target.value);
						setPagina(1);
					}}
					className="max-w-sm"
				/>
			</div>

			{isLoading ? (
				<div className="rounded-lg border">
					<TableSkeleton rows={5}>
						<TableHead>CFOP entrada</TableHead>
						<TableHead>CST/CSOSN</TableHead>
						<TableHead>NCM</TableHead>
						<TableHead>UF</TableHead>
						<TableHead className="w-28 text-right">Ações</TableHead>
					</TableSkeleton>
				</div>
			) : (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>CFOP entrada</TableHead>
								<TableHead>CST/CSOSN</TableHead>
								<TableHead>NCM</TableHead>
								<TableHead>UF</TableHead>
								<TableHead className="w-28 text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{registros.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="text-center text-muted-foreground"
									>
										Nenhuma regra cadastrada.
									</TableCell>
								</TableRow>
							) : (
								registros.map((registro) => (
									<TableRow
										key={registro.id}
										className={
											registroEdicao?.id === registro.id ? "bg-muted/50" : ""
										}
									>
										<TableCell>{registro.codigocfopentrada ?? "-"}</TableCell>
										<TableCell>
											{registro.cstentrada || registro.csosnentrada || "-"}
										</TableCell>
										<TableCell>{registro.ncm ?? "-"}</TableCell>
										<TableCell>{registro.uf ?? "Todas"}</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Editar regra"
													onClick={() => setRegistroEdicao(registro)}
												>
													<IconPencil className="h-4 w-4" aria-hidden="true" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Excluir regra"
													onClick={() => excluirMutation.mutate(registro.id)}
													disabled={excluirMutation.isPending}
												>
													<IconTrash className="h-4 w-4" aria-hidden="true" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{paginacao && paginacao.totalPages > 1 && (
				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pagina <= 1}
						onClick={() => setPagina((valor) => valor - 1)}
					>
						Anterior
					</Button>
					<span className="text-sm text-muted-foreground">
						Página {paginacao.page} de {paginacao.totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pagina >= paginacao.totalPages}
						onClick={() => setPagina((valor) => valor + 1)}
					>
						Próxima
					</Button>
				</div>
			)}

			<section className="rounded-lg border p-4 space-y-6">
				<h2 className="text-lg font-semibold">
					{registroEdicao ? "Editar regra" : "Nova regra"}
				</h2>

				<form onSubmit={handleSubmit(onSubmit)}>
					<FieldGroup>
						<div className="space-y-4">
							<h3 className="text-base font-semibold">Entrada</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<Field data-invalid={!!errors.codigocfopentrada}>
									<FieldLabel htmlFor="codigocfopentrada">
										CFOP entrada *
									</FieldLabel>
									<Input
										id="codigocfopentrada"
										placeholder="Ex.: 1102"
										maxLength={10}
										{...register("codigocfopentrada")}
									/>
									<FieldError
										errors={
											errors.codigocfopentrada
												? [errors.codigocfopentrada]
												: []
										}
									/>
								</Field>

								<Field data-invalid={!!errors.cstentrada}>
									<FieldLabel htmlFor="cstentrada">CST entrada</FieldLabel>
									<Select
										value={watch("cstentrada") ?? "none"}
										onValueChange={(valor) =>
											setValue(
												"cstentrada",
												valor === "none" ? null : valor,
												{ shouldValidate: true },
											)
										}
									>
										<SelectTrigger id="cstentrada" className="w-full">
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Nenhum</SelectItem>
											{OPCOES_CST_ICMS.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>

								<Field data-invalid={!!errors.csosnentrada}>
									<FieldLabel htmlFor="csosnentrada">CSOSN entrada</FieldLabel>
									<Select
										value={watch("csosnentrada") ?? "none"}
										onValueChange={(valor) =>
											setValue(
												"csosnentrada",
												valor === "none" ? null : valor,
												{ shouldValidate: true },
											)
										}
									>
										<SelectTrigger id="csosnentrada" className="w-full">
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Nenhum</SelectItem>
											{OPCOES_CSOSN.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>

								<Field data-invalid={!!errors.ncm}>
									<FieldLabel htmlFor="ncm">NCM</FieldLabel>
									<Input
										id="ncm"
										placeholder="Ex.: 22021000"
										maxLength={10}
										{...register("ncm")}
									/>
								</Field>

								<Field data-invalid={!!errors.taxaicmsentrada}>
									<FieldLabel htmlFor="taxaicmsentrada">
										Alíquota ICMS entrada (%)
									</FieldLabel>
									<Input
										id="taxaicmsentrada"
										placeholder="Ex.: 18"
										{...register("taxaicmsentrada")}
									/>
								</Field>

								<Field data-invalid={!!errors.uf}>
									<FieldLabel htmlFor="uf">UF</FieldLabel>
									<Input
										id="uf"
										placeholder="Ex.: SP"
										maxLength={2}
										{...register("uf")}
									/>
								</Field>
							</div>

							<div className="flex items-center gap-3">
								<Checkbox
									id="ignorarprimeirodigitocst"
									checked={!!ignorarprimeirodigitocst}
									onCheckedChange={(checked) =>
										setValue("ignorarprimeirodigitocst", checked === true, {
											shouldValidate: true,
										})
									}
								/>
								<Label
									htmlFor="ignorarprimeirodigitocst"
									className="cursor-pointer font-normal"
								>
									Ignorar primeiro dígito do CST na entrada
								</Label>
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="text-base font-semibold">Saída NFe</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<CampoCfopProduto
									id="idcfopsaidanfe"
									label="CFOP saída NFe"
									value={idcfopsaidanfe}
									tipomovimento="S"
									onChange={(valor) =>
										setValue("idcfopsaidanfe", valor || null, {
											shouldValidate: true,
										})
									}
									erro={errors.idcfopsaidanfe?.message}
								/>

								<Field data-invalid={!!errors.cstnfe}>
									<FieldLabel htmlFor="cstnfe">CST NFe</FieldLabel>
									<Select
										value={watch("cstnfe") ?? "none"}
										onValueChange={(valor) =>
											setValue("cstnfe", valor === "none" ? null : valor, {
												shouldValidate: true,
											})
										}
									>
										<SelectTrigger id="cstnfe" className="w-full">
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Nenhum</SelectItem>
											{OPCOES_CST_ICMS.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>

								<Field data-invalid={!!errors.csosnnfe}>
									<FieldLabel htmlFor="csosnnfe">CSOSN NFe</FieldLabel>
									<Select
										value={watch("csosnnfe") ?? "none"}
										onValueChange={(valor) =>
											setValue("csosnnfe", valor === "none" ? null : valor, {
												shouldValidate: true,
											})
										}
									>
										<SelectTrigger id="csosnnfe" className="w-full">
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Nenhum</SelectItem>
											{OPCOES_CSOSN.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>

								<Field data-invalid={!!errors.taxaicmsnfe}>
									<FieldLabel htmlFor="taxaicmsnfe">
										Alíquota ICMS NFe (%)
									</FieldLabel>
									<Input
										id="taxaicmsnfe"
										placeholder="Ex.: 18"
										{...register("taxaicmsnfe")}
									/>
								</Field>
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="text-base font-semibold">Saída NFC-e / CFe</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<CampoCfopProduto
									id="idcfopsaidanfce"
									label="CFOP saída NFC-e"
									value={idcfopsaidanfce}
									tipomovimento="S"
									onChange={(valor) =>
										setValue("idcfopsaidanfce", valor || null, {
											shouldValidate: true,
										})
									}
									erro={errors.idcfopsaidanfce?.message}
								/>

								<Field data-invalid={!!errors.cstnfce}>
									<FieldLabel htmlFor="cstnfce">CST NFC-e</FieldLabel>
									<Select
										value={watch("cstnfce") ?? "none"}
										onValueChange={(valor) =>
											setValue("cstnfce", valor === "none" ? null : valor, {
												shouldValidate: true,
											})
										}
									>
										<SelectTrigger id="cstnfce" className="w-full">
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Nenhum</SelectItem>
											{OPCOES_CST_ICMS.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>

								<Field data-invalid={!!errors.csosnnfce}>
									<FieldLabel htmlFor="csosnnfce">CSOSN NFC-e</FieldLabel>
									<Select
										value={watch("csosnnfce") ?? "none"}
										onValueChange={(valor) =>
											setValue("csosnnfce", valor === "none" ? null : valor, {
												shouldValidate: true,
											})
										}
									>
										<SelectTrigger id="csosnnfce" className="w-full">
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Nenhum</SelectItem>
											{OPCOES_CSOSN.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>

								<Field data-invalid={!!errors.taxaicmsnfce}>
									<FieldLabel htmlFor="taxaicmsnfce">
										Alíquota ICMS NFC-e (%)
									</FieldLabel>
									<Input
										id="taxaicmsnfce"
										placeholder="Ex.: 18"
										{...register("taxaicmsnfce")}
									/>
								</Field>
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="text-base font-semibold">PIS / COFINS / IPI</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<Field data-invalid={!!errors.aliquotapis}>
									<FieldLabel htmlFor="aliquotapis">
										Alíquota PIS (%)
									</FieldLabel>
									<Input
										id="aliquotapis"
										placeholder="Ex.: 1,65"
										{...register("aliquotapis")}
									/>
								</Field>

								<Field data-invalid={!!errors.cstpis}>
									<FieldLabel htmlFor="cstpis">CST PIS</FieldLabel>
									<Input
										id="cstpis"
										placeholder="Ex.: 01"
										maxLength={2}
										{...register("cstpis")}
									/>
								</Field>

								<Field data-invalid={!!errors.aliquotacofins}>
									<FieldLabel htmlFor="aliquotacofins">
										Alíquota COFINS (%)
									</FieldLabel>
									<Input
										id="aliquotacofins"
										placeholder="Ex.: 7,6"
										{...register("aliquotacofins")}
									/>
								</Field>

								<Field data-invalid={!!errors.cstcofins}>
									<FieldLabel htmlFor="cstcofins">CST COFINS</FieldLabel>
									<Input
										id="cstcofins"
										placeholder="Ex.: 01"
										maxLength={2}
										{...register("cstcofins")}
									/>
								</Field>

								<Field data-invalid={!!errors.cstipi}>
									<FieldLabel htmlFor="cstipi">CST IPI</FieldLabel>
									<Input
										id="cstipi"
										placeholder="Ex.: 53"
										maxLength={2}
										{...register("cstipi")}
									/>
								</Field>

								<Field data-invalid={!!errors.percentualmva}>
									<FieldLabel htmlFor="percentualmva">MVA (%)</FieldLabel>
									<Input
										id="percentualmva"
										placeholder="Ex.: 40"
										{...register("percentualmva")}
									/>
								</Field>

								<Field data-invalid={!!errors.percentualirrf}>
									<FieldLabel htmlFor="percentualirrf">IRRF (%)</FieldLabel>
									<Input
										id="percentualirrf"
										placeholder="Ex.: 1,5"
										{...register("percentualirrf")}
									/>
								</Field>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-2">
							{registroEdicao && (
								<Button type="button" variant="outline" onClick={novoRegistro}>
									Cancelar edição
								</Button>
							)}
							<Button type="submit" disabled={salvarMutation.isPending}>
								{salvarMutation.isPending
									? "Salvando..."
									: registroEdicao
										? "Salvar alterações"
										: "Cadastrar regra"}
							</Button>
						</div>
					</FieldGroup>
				</form>
			</section>
		</main>
	);
}
