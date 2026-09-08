"use client";

import { useId } from "react";
import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	CHECKBOXES_GERAL_CFOP,
	FINALIDADE_EMISSAO_NFE_CFOP,
	INTEGRACAO_FINANCEIRO_CFOP,
	PRESENCA_CONSUMIDOR_CFOP,
	TIPO_CONSIGNACAO_CFOP,
	TIPO_VALOR_PRECO_CFOP,
} from "@/constants/cfop-natureza";
import type { CfopFormData } from "@/schemas/cfop.schema";
import type { Cfop } from "@/services/cfop.service";
import type { PlanoContas } from "@/services/plano-contas.service";
import type { TipoDocumentoFinanceiro } from "@/services/tipo-documento-financeiro.service";

type NaturezaAbaGeralProps = {
	control: Control<CfopFormData>;
	errors: FieldErrors<CfopFormData>;
	register: ReturnType<
		typeof import("react-hook-form").useForm<CfopFormData>
	>["register"];
	planosContas: PlanoContas[];
	tiposDocumento: TipoDocumentoFinanceiro[];
	naturezas: Cfop[];
	carregandoRelacionados?: boolean;
};

function SelectOpcionalNumerico(props: {
	id: string;
	label: string;
	value: number | null | undefined;
	onChange: (valor: number | null) => void;
	opcoes: readonly { value: number; label: string }[];
	disabled?: boolean;
	error?: FieldErrors<CfopFormData>[keyof CfopFormData];
}) {
	return (
		<Field data-invalid={!!props.error}>
			<FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
			<Select
				value={props.value == null ? "none" : String(props.value)}
				onValueChange={(valor) =>
					props.onChange(valor === "none" ? null : Number(valor))
				}
				disabled={props.disabled}
			>
				<SelectTrigger id={props.id} className="w-full">
					<SelectValue placeholder="Não informado" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">Não informado</SelectItem>
					{props.opcoes.map((opcao) => (
						<SelectItem key={opcao.value} value={String(opcao.value)}>
							{opcao.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{props.error ? <FieldError errors={[props.error]} /> : null}
		</Field>
	);
}

function SelectOpcionalId(props: {
	id: string;
	label: string;
	value: string | null | undefined;
	onChange: (valor: string | null) => void;
	opcoes: { value: string; label: string }[];
	disabled?: boolean;
	error?: FieldErrors<CfopFormData>[keyof CfopFormData];
}) {
	return (
		<Field data-invalid={!!props.error}>
			<FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
			<Select
				value={props.value || "none"}
				onValueChange={(valor) =>
					props.onChange(valor === "none" ? null : valor)
				}
				disabled={props.disabled}
			>
				<SelectTrigger id={props.id} className="w-full">
					<SelectValue placeholder="Não informado" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">Não informado</SelectItem>
					{props.opcoes.map((opcao) => (
						<SelectItem key={opcao.value} value={opcao.value}>
							{opcao.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{props.error ? <FieldError errors={[props.error]} /> : null}
		</Field>
	);
}

export function NaturezaAbaGeral({
	control,
	errors,
	register,
	planosContas,
	tiposDocumento,
	naturezas,
	carregandoRelacionados = false,
}: NaturezaAbaGeralProps) {
	const idBase = useId();
	const campoId = (nome: string) => `${idBase}-${nome}`;

	const opcoesPlanos = planosContas.map((plano) => ({
		value: plano.id,
		label: [plano.codigo, plano.nome].filter(Boolean).join(" - ") || plano.id,
	}));

	const opcoesTiposDocumento = tiposDocumento.map((tipo) => ({
		value: tipo.id,
		label: tipo.descricao,
	}));

	const opcoesNaturezas = naturezas.map((natureza) => ({
		value: natureza.id,
		label:
			[natureza.codigo, natureza.descricao].filter(Boolean).join(" - ") ||
			natureza.id,
	}));

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<h2 className="text-sm font-semibold">Identificação</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Field data-invalid={!!errors.codigo}>
						<FieldLabel htmlFor={campoId("codigo")}>CFOP</FieldLabel>
						<Input
							id={campoId("codigo")}
							placeholder="Ex: 5102"
							maxLength={20}
							aria-invalid={!!errors.codigo}
							{...register("codigo")}
						/>
						<p className="text-sm text-muted-foreground">
							1, 2 ou 3 = entrada · 5, 6 ou 7 = saída
						</p>
						<FieldError errors={errors.codigo ? [errors.codigo] : []} />
					</Field>

					<Field data-invalid={!!errors.ativo}>
						<FieldLabel htmlFor={campoId("ativo")}>Ativo</FieldLabel>
						<div className="flex h-9 items-center gap-3 rounded-md border px-3">
							<Controller
								name="ativo"
								control={control}
								render={({ field }) => (
									<Switch
										id={campoId("ativo")}
										checked={field.value}
										onCheckedChange={field.onChange}
										aria-invalid={!!errors.ativo}
									/>
								)}
							/>
							<span className="text-sm text-muted-foreground">
								Natureza disponível para uso
							</span>
						</div>
						<FieldError errors={errors.ativo ? [errors.ativo] : []} />
					</Field>

					<Field data-invalid={!!errors.descricao} className="md:col-span-2">
						<FieldLabel htmlFor={campoId("descricao")}>Descrição</FieldLabel>
						<Input
							id={campoId("descricao")}
							placeholder="Descrição da natureza de operação"
							maxLength={1024}
							aria-invalid={!!errors.descricao}
							{...register("descricao")}
						/>
						<FieldError errors={errors.descricao ? [errors.descricao] : []} />
					</Field>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-semibold">Configurações</h2>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{CHECKBOXES_GERAL_CFOP.map((item) => (
						<div key={item.name} className="flex items-start gap-3">
							<Controller
								name={item.name}
								control={control}
								render={({ field }) => (
									<Checkbox
										id={campoId(item.name)}
										checked={!!field.value}
										onCheckedChange={(checked) =>
											field.onChange(checked === true)
										}
										aria-invalid={!!errors[item.name]}
									/>
								)}
							/>
							<FieldLabel
								htmlFor={campoId(item.name)}
								className="font-normal leading-5"
							>
								{item.label}
							</FieldLabel>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-semibold">Operação e financeiro</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Controller
						name="tipoConsignacao"
						control={control}
						render={({ field }) => (
							<Field data-invalid={!!errors.tipoConsignacao}>
								<FieldLabel htmlFor={campoId("tipoConsignacao")}>
									Tipo de consignação
								</FieldLabel>
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id={campoId("tipoConsignacao")}
										className="w-full"
									>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										{TIPO_CONSIGNACAO_CFOP.map((opcao) => (
											<SelectItem key={opcao.value} value={opcao.value}>
												{opcao.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldError
									errors={
										errors.tipoConsignacao ? [errors.tipoConsignacao] : []
									}
								/>
							</Field>
						)}
					/>

					<Controller
						name="presencaconsumidor"
						control={control}
						render={({ field }) => (
							<SelectOpcionalNumerico
								id={campoId("presencaconsumidor")}
								label="Presença consumidor"
								value={field.value}
								onChange={field.onChange}
								opcoes={PRESENCA_CONSUMIDOR_CFOP}
								error={errors.presencaconsumidor}
							/>
						)}
					/>

					<Controller
						name="finalidadeemissaonfe"
						control={control}
						render={({ field }) => (
							<SelectOpcionalNumerico
								id={campoId("finalidadeemissaonfe")}
								label="Finalidade"
								value={field.value}
								onChange={field.onChange}
								opcoes={FINALIDADE_EMISSAO_NFE_CFOP}
								error={errors.finalidadeemissaonfe}
							/>
						)}
					/>

					<Controller
						name="tipovalorpreco"
						control={control}
						render={({ field }) => (
							<SelectOpcionalNumerico
								id={campoId("tipovalorpreco")}
								label="Tipo de preço"
								value={field.value}
								onChange={field.onChange}
								opcoes={TIPO_VALOR_PRECO_CFOP}
								error={errors.tipovalorpreco}
							/>
						)}
					/>

					<Controller
						name="integracao"
						control={control}
						render={({ field }) => (
							<SelectOpcionalNumerico
								id={campoId("integracao")}
								label="Integração com financeiro"
								value={field.value}
								onChange={field.onChange}
								opcoes={INTEGRACAO_FINANCEIRO_CFOP}
								error={errors.integracao}
							/>
						)}
					/>

					<Controller
						name="idplanocontas"
						control={control}
						render={({ field }) => (
							<SelectOpcionalId
								id={campoId("idplanocontas")}
								label="Plano de contas"
								value={field.value}
								onChange={field.onChange}
								opcoes={opcoesPlanos}
								disabled={carregandoRelacionados}
								error={errors.idplanocontas}
							/>
						)}
					/>

					<Controller
						name="idtipodocumentofinanceiro"
						control={control}
						render={({ field }) => (
							<SelectOpcionalId
								id={campoId("idtipodocumentofinanceiro")}
								label="Tipo de documento"
								value={field.value}
								onChange={field.onChange}
								opcoes={opcoesTiposDocumento}
								disabled={carregandoRelacionados}
								error={errors.idtipodocumentofinanceiro}
							/>
						)}
					/>

					<Controller
						name="idnaturezaoperacaoinversa"
						control={control}
						render={({ field }) => (
							<SelectOpcionalId
								id={campoId("idnaturezaoperacaoinversa")}
								label="Natureza da operação inversa"
								value={field.value}
								onChange={field.onChange}
								opcoes={opcoesNaturezas}
								disabled={carregandoRelacionados}
								error={errors.idnaturezaoperacaoinversa}
							/>
						)}
					/>

					<Controller
						name="idnaturezanaocontribuinte"
						control={control}
						render={({ field }) => (
							<SelectOpcionalId
								id={campoId("idnaturezanaocontribuinte")}
								label="Natureza operação não contribuinte ICMS"
								value={field.value}
								onChange={field.onChange}
								opcoes={opcoesNaturezas}
								disabled={carregandoRelacionados}
								error={errors.idnaturezanaocontribuinte}
							/>
						)}
					/>

					<Controller
						name="idnaturezadevolucao"
						control={control}
						render={({ field }) => (
							<SelectOpcionalId
								id={campoId("idnaturezadevolucao")}
								label="Devolução de Cliente/Fornecedor"
								value={field.value}
								onChange={field.onChange}
								opcoes={opcoesNaturezas}
								disabled={carregandoRelacionados}
								error={errors.idnaturezadevolucao}
							/>
						)}
					/>
				</div>
			</section>
		</div>
	);
}
