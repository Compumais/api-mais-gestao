import { useEffect, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import type { ProdutoLocal } from "@/lib/pdv-types";
import { montarItemPizzaMeioAMeio } from "@/lib/pizza-meio-a-meio";
import { money } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export type ItemPizzaMeioAMeio = {
	chave: string;
	idproduto: string;
	idprodutomeio: string;
	descricao: string;
	quantidade: number;
	precounitario: number;
	precototal: number;
};

type DialogPizzaMeioAMeioProps = {
	primeiro: ProdutoLocal;
	onCancelar: () => void;
	onInteira: (produto: ProdutoLocal) => void;
	onConfirmar: (item: ItemPizzaMeioAMeio) => void;
};

export function DialogPizzaMeioAMeio({
	primeiro,
	onCancelar,
	onInteira,
	onConfirmar,
}: DialogPizzaMeioAMeioProps) {
	const [pizzas, setPizzas] = useState<ProdutoLocal[]>([]);
	const [carregando, setCarregando] = useState(true);

	useEscapeFechaModal(true, onCancelar);

	useEffect(() => {
		void pdvInvoke<ProdutoLocal[]>("listarPizzas", primeiro.id)
			.then(setPizzas)
			.finally(() => setCarregando(false));
	}, [primeiro.id]);

	function confirmar(segundo: ProdutoLocal) {
		const montado = montarItemPizzaMeioAMeio(primeiro, segundo);
		onConfirmar({
			chave: crypto.randomUUID(),
			...montado,
		});
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="pdv-surface flex max-h-[90vh] w-[32rem] max-w-[95vw] flex-col gap-3 p-5">
				<h2 className="text-lg font-semibold">Pizza meio a meio</h2>
				<p className="text-sm text-muted-foreground">
					Primeiro sabor: <strong>{primeiro.descricao}</strong> (
					{money(primeiro.preco)}). Escolha o segundo sabor. O preço cobrado é o
					maior entre as metades (1 pizza).
				</p>
				<div className="min-h-0 flex-1 space-y-2 overflow-auto">
					{carregando && (
						<p className="text-sm text-muted-foreground">
							Carregando sabores...
						</p>
					)}
					{!carregando && pizzas.length === 0 && (
						<p className="text-sm text-muted-foreground">
							Não há outro produto pizza no catálogo para montar meio a meio.
						</p>
					)}
					{pizzas.map((pizza) => (
						<button
							key={pizza.id}
							type="button"
							onClick={() => confirmar(pizza)}
							className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-primary"
						>
							<span className="font-medium">{pizza.descricao}</span>
							<span className="text-primary">{money(pizza.preco)}</span>
						</button>
					))}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" className="flex-1" onClick={onCancelar}>
						Cancelar
					</Button>
					<Button
						variant="secondary"
						className="flex-1"
						onClick={() => onInteira(primeiro)}
					>
						Vender inteira
					</Button>
				</div>
			</div>
		</div>
	);
}
