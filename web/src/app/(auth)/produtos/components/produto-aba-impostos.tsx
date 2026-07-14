"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Controller,
	type Control,
	type FieldErrors,
	type UseFormRegister,
	type UseFormSetValue,
	type UseFormWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
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
import type { ProdutoFormData } from "@/schemas/produtos.schema";
import { cestService } from "@/services/cest.service";
import { taxaUfService } from "@/services/taxauf.service";
import { produtosService } from "@/services/produtos.service";
import {
	OPCOES_CSOSN,
	OPCOES_CST_ICMS,
	type OpcaoCst,
} from "@/util/cst-produto-util";
import { CampoCfopProduto } from "./campo-cfop-produto";
import {
	OPCOES_TIPO_PRODUTO,
	sugerirTipoprodutoPorCodigoCfop,
} from "@/constants/tipo-produto";

type ProdutoAbaImpostosProps = {
	control: Control<ProdutoFormData>;
	register: UseFormRegister<ProdutoFormData>;
	setValue: UseFormSetValue<ProdutoFormData>;
	watch: UseFormWatch<ProdutoFormData>;
	errors: FieldErrors<ProdutoFormData>;
};

type CampoCstSelectProps = {
	id: string;
	label: string;
	value?: string | null;
	opcoes: OpcaoCst[];
	onChange: (valor: string | null) => void;
	erro?: string;
};

function CampoCstSelect({
	id,
	label,
	value,
	opcoes,
	onChange,
	erro,
}: CampoCstSelectProps) {
	return (
		<Field data-invalid={!!erro}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Select
				value={value ?? "none"}
				onValueChange={(valor) =>
					onChange(valor === "none" ? null : valor)
				}
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
			<FieldError errors={erro ? [{ message: erro }] : []} />
		</Field>
	);
}

export function ProdutoAbaImpostos({
	control,
	register,
	setValue,
	watch,
	errors,
}: ProdutoAbaImpostosProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const idcfopsaida = watch("idcfopsaida");

	const { data: cests = [], isLoading: carregandoCests, isError: erroCests } = useQuery({
		queryKey: ["cests", empresa?.id, "produto"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return cestService.listarTodos({ idempresa: empresa.id });
		},
		enabled: !!empresa,
	});

	const { data: taxas = [], isLoading: carregandoTaxas } = useQuery({
		queryKey: ["taxas-uf", empresa?.id, "produto"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return taxaUfService.listarTodos({ idempresa: empresa.id });
		},
		enabled: !!empresa,
	});

	const preencherTributacaoMutation = useMutation({
		mutationFn: async () => {
			if (!empresa || !idcfopsaida) {
				throw new Error("CFOP de saída não selecionado");
			}
			return produtosService.tributacaoPorCfop(empresa.id, idcfopsaida);
		},
		onSuccess: (tributacao) => {
			const opcoes = { shouldDirty: true, shouldValidate: true };
			if (tributacao.idcfopsaida) {
				setValue("idcfopsaida", tributacao.idcfopsaida, opcoes);
			}
			setValue("idcfopsaidanfce", tributacao.idcfopsaidanfce ?? null, opcoes);
			setValue("situacaotributaria", tributacao.situacaotributaria ?? null, opcoes);
			setValue("situacaotributariasn", tributacao.situacaotributariasn ?? null, opcoes);
			setValue("tributacaoespecial", tributacao.tributacaoespecial ?? null, opcoes);
			setValue("tributacaosn", tributacao.tributacaosn ?? null, opcoes);
			toast.success("Tributação preenchida automaticamente");
		},
		onError: () => {
			toast.error("Não foi possível obter tributação para o CFOP selecionado");
		},
	});

	const opcoesCest = cests.map((cest) => ({
		value: cest.id,
		label: `${cest.codigo} - ${cest.descricao}`,
	}));

	const opcoesTaxa = taxas.map((taxa) => ({
		value: taxa.id,
		label: `${taxa.codigo} - ${taxa.descricao}`,
	}));

	return (
		<FieldGroup>
			<div className="space-y-6">
				<section className="space-y-4">
					<h3 className="text-base font-semibold">Classificação fiscal</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.ncm}>
							<FieldLabel htmlFor="ncm">NCM *</FieldLabel>
							<Input
								id="ncm"
								placeholder="Ex.: 22021000"
								maxLength={10}
								aria-invalid={!!errors.ncm}
								{...register("ncm")}
							/>
							<FieldError errors={errors.ncm ? [errors.ncm] : []} />
						</Field>

						<Controller
							name="origem"
							control={control}
							render={({ field }) => (
								<Field data-invalid={!!errors.origem}>
									<FieldLabel htmlFor="origem">Origem da mercadoria *</FieldLabel>
									<Select
										value={field.value?.toString()}
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Selecione a origem" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="0">0 - Nacional</SelectItem>
											<SelectItem value="1">
												1 - Estrangeira (importação direta)
											</SelectItem>
											<SelectItem value="2">
												2 - Estrangeira (adquirida no mercado interno)
											</SelectItem>
											<SelectItem value="3">
												3 - Nacional (conteúdo importação {'>'} 40%)
											</SelectItem>
											<SelectItem value="4">
												4 - Nacional (processos produtivos básicos)
											</SelectItem>
											<SelectItem value="5">
												5 - Nacional (conteúdo importação ≤ 40%)
											</SelectItem>
											<SelectItem value="6">
												6 - Estrangeira (importação direta, sem similar)
											</SelectItem>
											<SelectItem value="7">
												7 - Estrangeira (mercado interno, sem similar)
											</SelectItem>
											<SelectItem value="8">
												8 - Nacional (conteúdo importação {'>'} 70%)
											</SelectItem>
										</SelectContent>
									</Select>
									<FieldError errors={errors.origem ? [errors.origem] : []} />
								</Field>
							)}
						/>

						<Controller
							name="idcest"
							control={control}
							render={({ field }) => (
								<Field data-invalid={!!errors.idcest}>
									<FieldLabel htmlFor="idcest">CEST</FieldLabel>
									<Combobox
										options={opcoesCest}
										value={field.value ?? ""}
										onChange={(valor) => field.onChange(valor || null)}
										placeholder={
											carregandoCests
												? "Carregando..."
												: erroCests
													? "Erro ao carregar CEST"
													: "Selecione o CEST"
										}
										disabled={carregandoCests || erroCests}
										searchPlaceholder="Buscar CEST..."
										emptyMessage="Nenhum CEST encontrado"
									/>
									<FieldError errors={errors.idcest ? [errors.idcest] : []} />
								</Field>
							)}
						/>

						<Controller
							name="idtaxauf"
							control={control}
							render={({ field }) => (
								<Field data-invalid={!!errors.idtaxauf}>
									<FieldLabel htmlFor="idtaxauf">Taxa (ECF/PDV)</FieldLabel>
									<Combobox
										options={opcoesTaxa}
										value={field.value ?? ""}
										onChange={(valor) => field.onChange(valor || null)}
										placeholder={
											carregandoTaxas ? "Carregando..." : "Selecione a taxa"
										}
										searchPlaceholder="Buscar taxa..."
										emptyMessage="Nenhuma taxa encontrada"
									/>
									<FieldError errors={errors.idtaxauf ? [errors.idtaxauf] : []} />
								</Field>
							)}
						/>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-base font-semibold">CFOP de entrada</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Controller
							name="idcfopentrada"
							control={control}
							render={({ field }) => (
								<CampoCfopProduto
									id="idcfopentrada"
									label="CFOP de entrada"
									value={field.value}
									tipomovimento="E"
									onChange={(valor, cfop) => {
										field.onChange(valor || null);
										const tipoproduto =
											cfop?.tipoproduto?.trim() ||
											sugerirTipoprodutoPorCodigoCfop(cfop?.codigo);
										setValue("tipoproduto", tipoproduto, {
											shouldValidate: true,
										});
									}}
									erro={errors.idcfopentrada?.message}
								/>
							)}
						/>

						<Field data-invalid={!!errors.tipoproduto}>
							<FieldLabel htmlFor="tipoproduto">
								Tipo de produto
							</FieldLabel>
							<Controller
								name="tipoproduto"
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
							<FieldError
								errors={errors.tipoproduto ? [errors.tipoproduto] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.situacaotributariasnentrada}>
							<FieldLabel htmlFor="situacaotributariasnentrada">
								CST/CSOSN entrada
							</FieldLabel>
							<Input
								id="situacaotributariasnentrada"
								placeholder="Ex.: 102 ou 00"
								type="number"
								maxLength={3}
								{...register("situacaotributariasnentrada")}
							/>
							<FieldError
								errors={
									errors.situacaotributariasnentrada
										? [errors.situacaotributariasnentrada]
										: []
								}
							/>
						</Field>
					</div>
				</section>

				<section className="space-y-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<h3 className="text-base font-semibold">CFOP de emissão</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!idcfopsaida || preencherTributacaoMutation.isPending}
							onClick={() => preencherTributacaoMutation.mutate()}
						>
							{preencherTributacaoMutation.isPending
								? "Preenchendo..."
								: "Preencher tributação automaticamente"}
						</Button>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Controller
							name="idcfopsaida"
							control={control}
							render={({ field }) => (
								<CampoCfopProduto
									id="idcfopsaida"
									label="CFOP NF (saída)"
									value={field.value}
									tipomovimento="S"
									onChange={(valor) => field.onChange(valor || null)}
									erro={errors.idcfopsaida?.message}
								/>
							)}
						/>
						<Controller
							name="idcfopsaidanfce"
							control={control}
							render={({ field }) => (
								<CampoCfopProduto
									id="idcfopsaidanfce"
									label="CFOP ECF (NFC-e)"
									value={field.value}
									tipomovimento="S"
									onChange={(valor) => field.onChange(valor || null)}
									erro={errors.idcfopsaidanfce?.message}
								/>
							)}
						/>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-base font-semibold">
						ICMS contribuinte (NFe)
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Controller
							name="situacaotributaria"
							control={control}
							render={({ field }) => (
								<CampoCstSelect
									id="situacaotributaria"
									label="CST"
									value={field.value}
									opcoes={OPCOES_CST_ICMS}
									onChange={field.onChange}
									erro={errors.situacaotributaria?.message}
								/>
							)}
						/>
						<Controller
							name="situacaotributariasn"
							control={control}
							render={({ field }) => (
								<CampoCstSelect
									id="situacaotributariasn"
									label="CSOSN"
									value={field.value}
									opcoes={OPCOES_CSOSN}
									onChange={field.onChange}
									erro={errors.situacaotributariasn?.message}
								/>
							)}
						/>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-base font-semibold">
						ICMS não contribuinte (CFe)
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Controller
							name="tributacaoespecial"
							control={control}
							render={({ field }) => (
								<CampoCstSelect
									id="tributacaoespecial"
									label="CST"
									value={field.value}
									opcoes={OPCOES_CST_ICMS}
									onChange={field.onChange}
									erro={errors.tributacaoespecial?.message}
								/>
							)}
						/>
						<Controller
							name="tributacaosn"
							control={control}
							render={({ field }) => (
								<CampoCstSelect
									id="tributacaosn"
									label="CSOSN"
									value={field.value}
									opcoes={OPCOES_CSOSN}
									onChange={field.onChange}
									erro={errors.tributacaosn?.message}
								/>
							)}
						/>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-base font-semibold">IPI</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.cstipientrada}>
							<FieldLabel htmlFor="cstipientrada">CST IPI entrada</FieldLabel>
							<Input
								id="cstipientrada"
								placeholder="Ex.: 50"
								maxLength={3}
								{...register("cstipientrada")}
							/>
							<FieldError
								errors={errors.cstipientrada ? [errors.cstipientrada] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.cstipisaida}>
							<FieldLabel htmlFor="cstipisaida">CST IPI saída</FieldLabel>
							<Input
								id="cstipisaida"
								placeholder="Ex.: 50"
								maxLength={3}
								{...register("cstipisaida")}
							/>
							<FieldError
								errors={errors.cstipisaida ? [errors.cstipisaida] : []}
							/>
						</Field>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-base font-semibold">PIS / COFINS</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field data-invalid={!!errors.cstpisentrada}>
							<FieldLabel htmlFor="cstpisentrada">CST PIS entrada</FieldLabel>
							<Input
								id="cstpisentrada"
								placeholder="Ex.: 01"
								type="number"
								maxLength={2}
								{...register("cstpisentrada")}
							/>
							<FieldError
								errors={errors.cstpisentrada ? [errors.cstpisentrada] : []}
							/>
						</Field>

						<Field data-invalid={!!errors.cstcofinsentrada}>
							<FieldLabel htmlFor="cstcofinsentrada">
								CST COFINS entrada
							</FieldLabel>
							<Input
								id="cstcofinsentrada"
								placeholder="Ex.: 01"
								type="number"
								maxLength={2}
								{...register("cstcofinsentrada")}
							/>
							<FieldError
								errors={
									errors.cstcofinsentrada ? [errors.cstcofinsentrada] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.cstpis}>
							<FieldLabel htmlFor="cstpis">CST PIS saída</FieldLabel>
							<Input
								id="cstpis"
								placeholder="Ex.: 01"
								type="number"
								maxLength={2}
								{...register("cstpis")}
							/>
							<FieldError errors={errors.cstpis ? [errors.cstpis] : []} />
						</Field>

						<Field data-invalid={!!errors.cstcofins}>
							<FieldLabel htmlFor="cstcofins">CST COFINS saída</FieldLabel>
							<Input
								id="cstcofins"
								placeholder="Ex.: 01"
								type="number"
								maxLength={2}
								{...register("cstcofins")}
							/>
							<FieldError errors={errors.cstcofins ? [errors.cstcofins] : []} />
						</Field>
					</div>
				</section>
			</div>
		</FieldGroup>
	);
}
