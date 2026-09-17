"use client";

import {
	type Control,
	Controller,
	type FieldErrors,
	type UseFormRegister,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProdutoFormData } from "@/schemas/produtos.schema";

type ProdutoAbaBalancaProps = {
	control: Control<ProdutoFormData>;
	register: UseFormRegister<ProdutoFormData>;
	errors: FieldErrors<ProdutoFormData>;
};

export function ProdutoAbaBalanca({
	control,
	register,
	errors,
}: ProdutoAbaBalancaProps) {
	return (
		<FieldGroup>
			<div className="space-y-4">
				<h2 className="text-lg font-semibold">Balança</h2>
				<p className="text-sm text-muted-foreground">
					Define se o produto entra no arquivo TXTitens da Toledo MGV e quantos
					dias de validade a etiqueta deve usar.
				</p>
				<div className="flex items-center gap-3 rounded-lg border p-4">
					<Controller
						name="exportaBalanca"
						control={control}
						render={({ field }) => (
							<Checkbox
								id="exportaBalanca"
								type="button"
								checked={!!field.value}
								onCheckedChange={(checked) =>
									field.onChange(checked === true)
								}
							/>
						)}
					/>
					<div>
						<Label
							htmlFor="exportaBalanca"
							className="cursor-pointer font-normal"
						>
							Exportar para balança
						</Label>
						<p className="text-sm text-muted-foreground">
							Inclui este produto na exportação Ferramentas → Exportar produtos
							para MGV. O código do produto vira o PLU (1 a 999999).
						</p>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field data-invalid={!!errors.diasValidade}>
						<FieldLabel htmlFor="diasValidade">Dias de validade</FieldLabel>
						<Input
							id="diasValidade"
							type="number"
							min={0}
							max={999}
							aria-invalid={!!errors.diasValidade}
							{...register("diasValidade", { valueAsNumber: true })}
						/>
						<FieldDescription>
							0 usa o padrão da tela de exportação. 1 a 990 imprime datas. 998
							não imprime. 999 solicita na balança.
						</FieldDescription>
						<FieldError
							errors={errors.diasValidade ? [errors.diasValidade] : []}
						/>
					</Field>
				</div>
			</div>
		</FieldGroup>
	);
}
