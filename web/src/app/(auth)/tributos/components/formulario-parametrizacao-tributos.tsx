"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { CampoCfopProduto } from "@/app/(auth)/produtos/components/campo-cfop-produto";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParametrizacaoTributosFormData } from "@/schemas/parametrizacao-tributos.schema";
import { OPCOES_TIPO_PRODUTO } from "@/constants/tipo-produto";
import {
	OPCOES_CSOSN,
	OPCOES_CST_ICMS,
} from "@/util/cst-produto-util";

type FormularioParametrizacaoTributosProps = {
	form: UseFormReturn<ParametrizacaoTributosFormData>;
	onSubmit: (dados: ParametrizacaoTributosFormData) => void;
	isPending: boolean;
	submitLabel: string;
	showCancel?: boolean;
	onCancel?: () => void;
	cancelLabel?: string;
};

const OPCAO_NENHUM = { value: "none", label: "Nenhum" } as const;

function opcoesComNenhum(opcoes: Array<{ value: string; label: string }>) {
	return [OPCAO_NENHUM, ...opcoes];
}

function CampoCstCombobox({
	id,
	label,
	value,
	opcoes,
	onChange,
	erro,
}: {
	id: string;
	label: string;
	value?: string | null;
	opcoes: Array<{ value: string; label: string }>;
	onChange: (valor: string | null) => void;
	erro?: string;
}) {
	return (
		<Field data-invalid={!!erro}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Combobox
				options={opcoesComNenhum(opcoes)}
				value={value ?? "none"}
				onChange={(selecionado) =>
					onChange(selecionado === "none" || !selecionado ? null : selecionado)
				}
				placeholder="Selecione"
				searchPlaceholder="Buscar..."
				emptyMessage="Nenhuma opção encontrada"
			/>
			<FieldError errors={erro ? [{ message: erro }] : []} />
		</Field>
	);
}

export function FormularioParametrizacaoTributos({
	form,
	onSubmit,
	isPending,
	submitLabel,
	showCancel = false,
	onCancel,
	cancelLabel = "Cancelar",
}: FormularioParametrizacaoTributosProps) {
	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const ignorarprimeirodigitocst = watch("ignorarprimeirodigitocst");

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h3 className="text-base font-semibold">Entrada</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Field data-invalid={!!errors.codigocfopentrada}>
							<FieldLabel htmlFor="codigocfopentrada">
								CFOP do XML (fornecedor) *
							</FieldLabel>
							<Input
								id="codigocfopentrada"
								placeholder="Ex.: 5102"
								maxLength={10}
								aria-describedby="codigocfopentrada-ajuda"
								{...register("codigocfopentrada")}
							/>
							<p
								id="codigocfopentrada-ajuda"
								className="text-muted-foreground text-xs"
							>
								Use o CFOP que vem no XML da nota do fornecedor (geralmente
								5xxx/6xxx), não o CFOP operacional de entrada (1xxx).
							</p>
							<FieldError
								errors={
									errors.codigocfopentrada ? [errors.codigocfopentrada] : []
								}
							/>
						</Field>

						<Controller
							name="cstentrada"
							control={control}
							render={({ field }) => (
								<CampoCstCombobox
									id="cstentrada"
									label="CST entrada"
									value={field.value}
									opcoes={OPCOES_CST_ICMS}
									onChange={field.onChange}
									erro={errors.cstentrada?.message}
								/>
							)}
						/>

						<Controller
							name="csosnentrada"
							control={control}
							render={({ field }) => (
								<CampoCstCombobox
									id="csosnentrada"
									label="CSOSN entrada"
									value={field.value}
									opcoes={OPCOES_CSOSN}
									onChange={field.onChange}
									erro={errors.csosnentrada?.message}
								/>
							)}
						/>

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

						<Controller
							name="tipoproduto"
							control={control}
							render={({ field }) => (
								<CampoCstCombobox
									id="tipoproduto"
									label="Tipo de produto"
									value={field.value}
									opcoes={OPCOES_TIPO_PRODUTO}
									onChange={field.onChange}
									erro={errors.tipoproduto?.message}
								/>
							)}
						/>
						<p className="text-muted-foreground text-xs -mt-2 md:col-span-3">
							Tipo SPED 0200 aplicado ao produto na finalização da NF de
							entrada. Sem valor (ou sem match de regra), usa 00 —
							mercadoria para revenda.
						</p>
					</div>

					<div className="flex items-center gap-3">
						<Checkbox
							id="ignorarprimeirodigitocst"
							checked={!!ignorarprimeirodigitocst}
							onCheckedChange={(checked) =>
								setValue("ignorarprimeirodigitocst", checked === true, {
									shouldValidate: true,
									shouldDirty: true,
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
						<Controller
							name="idcfopsaidanfe"
							control={control}
							render={({ field }) => (
								<CampoCfopProduto
									id="idcfopsaidanfe"
									label="CFOP saída NFe"
									value={field.value}
									tipomovimento="S"
									onChange={(valor) => field.onChange(valor || null)}
									erro={errors.idcfopsaidanfe?.message}
								/>
							)}
						/>

						<Controller
							name="cstnfe"
							control={control}
							render={({ field }) => (
								<CampoCstCombobox
									id="cstnfe"
									label="CST NFe"
									value={field.value}
									opcoes={OPCOES_CST_ICMS}
									onChange={field.onChange}
									erro={errors.cstnfe?.message}
								/>
							)}
						/>

						<Controller
							name="csosnnfe"
							control={control}
							render={({ field }) => (
								<CampoCstCombobox
									id="csosnnfe"
									label="CSOSN NFe"
									value={field.value}
									opcoes={OPCOES_CSOSN}
									onChange={field.onChange}
									erro={errors.csosnnfe?.message}
								/>
							)}
						/>

						<Field data-invalid={!!errors.taxaicmsnfe}>
							<FieldLabel htmlFor="taxaicmsnfe">Alíquota ICMS NFe (%)</FieldLabel>
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
						<Controller
							name="idcfopsaidanfce"
							control={control}
							render={({ field }) => (
								<CampoCfopProduto
									id="idcfopsaidanfce"
									label="CFOP saída NFC-e"
									value={field.value}
									tipomovimento="S"
									onChange={(valor) => field.onChange(valor || null)}
									erro={errors.idcfopsaidanfce?.message}
								/>
							)}
						/>

						<Controller
							name="cstnfce"
							control={control}
							render={({ field }) => (
								<CampoCstCombobox
									id="cstnfce"
									label="CST NFC-e"
									value={field.value}
									opcoes={OPCOES_CST_ICMS}
									onChange={field.onChange}
									erro={errors.cstnfce?.message}
								/>
							)}
						/>

						<Controller
							name="csosnnfce"
							control={control}
							render={({ field }) => (
								<CampoCstCombobox
									id="csosnnfce"
									label="CSOSN NFC-e"
									value={field.value}
									opcoes={OPCOES_CSOSN}
									onChange={field.onChange}
									erro={errors.csosnnfce?.message}
								/>
							)}
						/>

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
							<FieldLabel htmlFor="aliquotapis">Alíquota PIS (%)</FieldLabel>
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
							<FieldLabel htmlFor="aliquotacofins">Alíquota COFINS (%)</FieldLabel>
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
					{showCancel && onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							{cancelLabel}
						</Button>
					)}
					<Button type="submit" disabled={isPending}>
						{isPending ? "Salvando..." : submitLabel}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
