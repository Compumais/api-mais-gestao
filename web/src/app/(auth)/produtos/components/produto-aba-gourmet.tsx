"use client";

import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ProdutoFormData } from "@/schemas/produtos.schema";

type GrupoGourmetOpcao = {
	id: string;
	nome?: string | null;
	codigo?: string | null;
};

type ProdutoAbaGourmetProps = {
	setValue: UseFormSetValue<ProdutoFormData>;
	watch: UseFormWatch<ProdutoFormData>;
	gruposGourmet: GrupoGourmetOpcao[];
};

export function ProdutoAbaGourmet({
	setValue,
	watch,
	gruposGourmet,
}: ProdutoAbaGourmetProps) {
	const idgrupogourmet = watch("idgrupogourmet");
	const espizza = watch("espizza");

	return (
		<FieldGroup>
			<div className="space-y-4">
				<h2 className="text-lg font-semibold">Gourmet</h2>
				<p className="text-sm text-muted-foreground">
					Define o cardápio de mesa/balcão, a impressão por setor e se o produto
					entra no fluxo de pizza meio a meio.
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="idgrupogourmet">Grupo gourmet</FieldLabel>
						<Select
							value={idgrupogourmet || "none"}
							onValueChange={(value) => setValue("idgrupogourmet", value)}
						>
							<SelectTrigger id="idgrupogourmet" className="w-full">
								<SelectValue placeholder="Nenhum" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Nenhum</SelectItem>
								{gruposGourmet.map((grupo) => (
									<SelectItem key={grupo.id} value={grupo.id}>
										{grupo.nome || grupo.codigo || grupo.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-sm text-muted-foreground">
							Usado no cardápio de mesa/balcão e na impressão por setor.
						</p>
					</Field>
				</div>
				<div className="flex items-center gap-3 rounded-lg border p-4">
					<Checkbox
						id="espizza"
						checked={!!espizza}
						onCheckedChange={(checked) =>
							setValue("espizza", checked === true, {
								shouldValidate: true,
							})
						}
					/>
					<div>
						<Label htmlFor="espizza" className="cursor-pointer font-normal">
							É pizza
						</Label>
						<p className="text-sm text-muted-foreground">
							No PDV e no POS, o operador escolhe dois sabores. O preço cobrado
							é o maior entre as metades (1 pizza, não 0,5+0,5).
						</p>
					</div>
				</div>
			</div>
		</FieldGroup>
	);
}
