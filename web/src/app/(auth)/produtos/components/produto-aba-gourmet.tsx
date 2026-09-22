"use client";

import { type Control, Controller } from "react-hook-form";
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
	control: Control<ProdutoFormData>;
	gruposGourmet: GrupoGourmetOpcao[];
};

export function ProdutoAbaGourmet({
	control,
	gruposGourmet,
}: ProdutoAbaGourmetProps) {
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
						<Controller
							name="idgrupogourmet"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value || "none"}
									onValueChange={field.onChange}
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
							)}
						/>
						<p className="text-sm text-muted-foreground">
							Usado no cardápio de mesa/balcão e na impressão por setor.
						</p>
					</Field>
				</div>
				<div className="flex items-center gap-3 rounded-lg border p-4">
					<Controller
						name="espizza"
						control={control}
						render={({ field }) => (
							<Checkbox
								id="espizza"
								checked={!!field.value}
								onCheckedChange={(checked) => field.onChange(checked === true)}
							/>
						)}
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

			<div className="mt-6 space-y-4">
				<h2 className="text-lg font-semibold">Garçom (mobile)</h2>
				<div className="flex items-center gap-3 rounded-lg border p-4">
					<Controller
						name="enviamobile"
						control={control}
						render={({ field }) => (
							<Checkbox
								id="enviamobile"
								checked={!!field.value}
								onCheckedChange={(checked) => field.onChange(checked === true)}
							/>
						)}
					/>
					<Label htmlFor="enviamobile" className="cursor-pointer font-normal">
						Exibir no garçom (mobile)
					</Label>
				</div>
				<p className="text-sm text-muted-foreground">
					Produtos marcados aparecem na tela do garçom, desde que o grupo também
					esteja habilitado.
				</p>
			</div>

			<div className="mt-6 space-y-4">
				<h2 className="text-lg font-semibold">Cardápio delivery</h2>
				<p className="text-sm text-muted-foreground">
					Produtos vinculados a um grupo gourmet aparecem no cardápio delivery
					público.
				</p>
				<div className="flex items-center gap-3 rounded-lg border p-4">
					<Controller
						name="exibircardapiodelivery"
						control={control}
						render={({ field }) => (
							<Checkbox
								id="exibircardapiodelivery"
								checked={!!field.value}
								onCheckedChange={(checked) => field.onChange(checked === true)}
							/>
						)}
					/>
					<Label
						htmlFor="exibircardapiodelivery"
						className="cursor-pointer font-normal"
					>
						Marcado para cardápio delivery
					</Label>
				</div>
			</div>
		</FieldGroup>
	);
}
