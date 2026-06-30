"use client";

import type { UseFormReturn } from "react-hook-form";
import { CampoCfopProduto } from "@/app/(auth)/produtos/components/campo-cfop-produto";
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
import type { ParametrizacaoTributosFormData } from "@/schemas/parametrizacao-tributos.schema";
import { OPCOES_CSOSN, OPCOES_CST_ICMS } from "@/util/cst-produto-util";

type FormularioParametrizacaoTributosProps = {
	form: UseFormReturn<ParametrizacaoTributosFormData>;
	onSubmit: (dados: ParametrizacaoTributosFormData) => void;
	isPending: boolean;
	submitLabel: string;
	showCancel?: boolean;
	onCancel?: () => void;
	cancelLabel?: string;
};

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
		setValue,
		watch,
		formState: { errors },
	} = form;

	const idcfopsaidanfe = watch("idcfopsaidanfe");
	const idcfopsaidanfce = watch("idcfopsaidanfce");
	const ignorarprimeirodigitocst = watch("ignorarprimeirodigitocst");

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<div className="space-y-4">
					<h3 className="text-base font-semibold">Entrada</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Field data-invalid={!!errors.codigocfopentrada}>
							<FieldLabel htmlFor="codigocfopentrada">CFOP entrada *</FieldLabel>
							<Input
								id="codigocfopentrada"
								placeholder="Ex.: 1102"
								maxLength={10}
								{...register("codigocfopentrada")}
							/>
							<FieldError
								errors={
									errors.codigocfopentrada ? [errors.codigocfopentrada] : []
								}
							/>
						</Field>

						<Field data-invalid={!!errors.cstentrada}>
							<FieldLabel htmlFor="cstentrada">CST entrada</FieldLabel>
							<Select
								value={watch("cstentrada") ?? "none"}
								onValueChange={(valor) =>
									setValue("cstentrada", valor === "none" ? null : valor, {
										shouldValidate: true,
									})
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
									setValue("csosnentrada", valor === "none" ? null : valor, {
										shouldValidate: true,
									})
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
