"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import {
	calcularPrecoVendaComMargem,
	type ItemPrecoVendaPendente,
	precoVendaPreenchido,
} from "@/util/preco-venda-importacao-nf";

type ModalPrecoVendaImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	itens: ItemPrecoVendaPendente[];
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	onConfirmado: () => void;
};

function formatarMoeda(valor: string): string {
	const numero = Number.parseFloat(valor.replace(",", "."));
	if (Number.isNaN(numero)) {
		return "—";
	}
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(numero);
}

export function ModalPrecoVendaImportacao({
	idempresa,
	idRascunho,
	itens,
	aberto,
	onAbertoChange,
	onConfirmado,
}: ModalPrecoVendaImportacaoProps) {
	const queryClient = useQueryClient();
	const [itensEditados, setItensEditados] = useState<ItemPrecoVendaPendente[]>(
		[],
	);
	const [margemPercentual, setMargemPercentual] = useState("");

	useEffect(() => {
		if (aberto) {
			setItensEditados(itens.map((item) => ({ ...item })));
			setMargemPercentual("");
		}
	}, [aberto, itens]);

	const { mutate: salvarPrecos, isPending } = useMutation({
		mutationFn: async (lista: ItemPrecoVendaPendente[]) => {
			await Promise.all(
				lista.map((item) =>
					notaFiscalService.atualizarItemRascunhoImportacao(
						idRascunho,
						item.idItem,
						{
							idempresa,
							precoVenda: item.precoVenda,
						},
					),
				),
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
			toast.success("Preços de venda atualizados");
			onAbertoChange(false);
			onConfirmado();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const aplicarMargemATodos = () => {
		const margem = Number.parseFloat(margemPercentual.replace(",", "."));
		if (Number.isNaN(margem)) {
			toast.error("Informe um percentual válido");
			return;
		}

		setItensEditados((atual) =>
			atual.map((item) => ({
				...item,
				precoVenda: calcularPrecoVendaComMargem(item.precocusto, margem),
			})),
		);
	};

	const confirmar = () => {
		const incompletos = itensEditados.filter(
			(item) => !precoVendaPreenchido(item.precoVenda),
		);

		if (incompletos.length > 0) {
			toast.error("Informe o preço de venda de todos os produtos");
			return;
		}

		salvarPrecos(itensEditados);
	};

	const atualizarPrecoItem = (idItem: string, precoVenda: string) => {
		setItensEditados((atual) =>
			atual.map((item) =>
				item.idItem === idItem ? { ...item, precoVenda } : item,
			),
		);
	};

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Preços de venda</DialogTitle>
					<DialogDescription>
						{itensEditados.length === 1
							? "Este produto está sem preço de venda. Informe o valor ou aplique uma margem sobre o custo."
							: `${itensEditados.length} produtos estão sem preço de venda. Informe individualmente ou aplique a mesma margem para todos.`}
					</DialogDescription>
				</DialogHeader>

				<section className="rounded-lg border bg-muted/30 p-4 space-y-3">
					<h3 className="text-sm font-medium">Aplicar margem a todos</h3>
					<p className="text-xs text-muted-foreground">
						O percentual é calculado sobre o preço de custo (estoque) de cada
						produto.
					</p>
					<div className="flex flex-wrap items-end gap-3">
						<div className="flex-1 min-w-[140px] space-y-1">
							<Label htmlFor="margem-percentual">Margem (%)</Label>
							<div className="relative">
								<Input
									id="margem-percentual"
									type="text"
									inputMode="decimal"
									placeholder="Ex: 30"
									value={margemPercentual}
									onChange={(event) =>
										setMargemPercentual(event.target.value)
									}
									className="pr-9"
								/>
								<Percent
									className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
									aria-hidden="true"
								/>
							</div>
						</div>
						<Button type="button" variant="secondary" onClick={aplicarMargemATodos}>
							Aplicar a todos
						</Button>
					</div>
				</section>

				<div className="flex-1 overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">#</TableHead>
								<TableHead>Produto</TableHead>
								<TableHead className="w-28 text-right">Custo</TableHead>
								<TableHead className="w-40">Preço de venda</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{itensEditados.map((item) => (
								<TableRow key={item.idItem}>
									<TableCell className="text-muted-foreground">
										{item.contador}
									</TableCell>
									<TableCell className="max-w-[200px] truncate">
										{item.descricao}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatarMoeda(item.precocusto)}
									</TableCell>
									<TableCell>
										<MoneyInput
											aria-label={`Preço de venda de ${item.descricao}`}
											value={item.precoVenda}
											onChange={(valor) =>
												atualizarPrecoItem(item.idItem, valor)
											}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						disabled={isPending}
						onClick={() => onAbertoChange(false)}
					>
						Cancelar
					</Button>
					<Button type="button" disabled={isPending} onClick={confirmar}>
						{isPending ? "Salvando..." : "Confirmar e finalizar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
