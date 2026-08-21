"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	type ProduzirFichaFormData,
	produzirFichaSchema,
} from "@/schemas/ficha-producao.schema";
import {
	type FichaProducao,
	fichaProducaoService,
} from "@/services/ficha-producao.service";

type ProduzirFichaDialogProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	ficha: FichaProducao | null;
};

export function ProduzirFichaDialog({
	aberto,
	onAbertoChange,
	ficha,
}: ProduzirFichaDialogProps) {
	const queryClient = useQueryClient();
	const form = useForm<ProduzirFichaFormData>({
		resolver: zodResolver(produzirFichaSchema),
		defaultValues: { quantidade: "1" },
	});

	const quantidade = form.watch("quantidade");
	const qtdNum =
		Number.parseFloat(String(quantidade ?? "0").replace(",", ".")) || 0;

	const preview = (ficha?.itens ?? []).map((item) => {
		const unit =
			Number.parseFloat(String(item.quantidade).replace(",", ".")) || 0;
		return {
			id: item.idproduto,
			nome:
				item.nomeproduto ??
				(item.codigoproduto != null
					? String(item.codigoproduto)
					: item.idproduto),
			consumo: unit * qtdNum,
		};
	});

	const { mutate, isPending } = useMutation({
		mutationFn: async (dados: ProduzirFichaFormData) => {
			if (!ficha) throw new Error("Ficha não selecionada");
			return fichaProducaoService.produzir(
				ficha.id,
				dados.quantidade.replace(",", "."),
			);
		},
		onSuccess: (resultado) => {
			queryClient.invalidateQueries({ queryKey: ["fichas-producao"] });
			queryClient.invalidateQueries({ queryKey: ["producoes"] });
			queryClient.invalidateQueries({ queryKey: ["estoque"] });
			toast.success(
				`Produção concluída: ${Number.parseFloat(resultado.quantidadeproduzida).toLocaleString("pt-BR")} un. · custo unit. R$ ${Number.parseFloat(resultado.custounitario).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
			);
			onAbertoChange(false);
			form.reset({ quantidade: "1" });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Falha ao produzir");
		},
	});

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Produzir em massa</DialogTitle>
					<DialogDescription>
						{ficha?.nomeprodutoacabado ?? "Produto acabado"} — informe a
						quantidade a fabricar. Os insumos serão baixados proporcionalmente.
					</DialogDescription>
				</DialogHeader>

				<form
					className="space-y-4"
					onSubmit={form.handleSubmit((data) => mutate(data))}
				>
					<Field>
						<FieldLabel htmlFor="quantidade">Quantidade a produzir</FieldLabel>
						<Input id="quantidade" {...form.register("quantidade")} />
						{form.formState.errors.quantidade && (
							<FieldError>
								{form.formState.errors.quantidade.message}
							</FieldError>
						)}
					</Field>

					{preview.length > 0 && qtdNum > 0 && (
						<div className="rounded-md border bg-muted/40 p-3 text-sm">
							<p className="mb-2 font-medium">Consumo estimado</p>
							<ul className="space-y-1">
								{preview.map((linha) => (
									<li key={linha.id}>
										{linha.nome}:{" "}
										<span className="tabular-nums">
											{linha.consumo.toLocaleString("pt-BR", {
												maximumFractionDigits: 6,
											})}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onAbertoChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending || !ficha}>
							Confirmar produção
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
