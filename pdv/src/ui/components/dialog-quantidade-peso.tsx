import { useCallback, useEffect, useMemo, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import { digitosDeKg, formatarKg, kgDeDigitos } from "@/lib/produto-kg";
import { money } from "@/lib/utils";
import { NumericKeypad } from "@/ui/components/numeric-keypad";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

type ProdutoPeso = {
	descricao: string;
	preco: number;
};

type BalancaPeso = {
	peso: number;
	conectado: boolean;
	origem: "balanca" | "nenhuma";
	mensagem: string;
};

export function DialogQuantidadePeso({
	produto,
	onCancelar,
	onConfirmar,
}: {
	produto: ProdutoPeso;
	onCancelar: () => void;
	onConfirmar: (quantidadeKg: number) => void;
}) {
	const [digitos, setDigitos] = useState("0");
	const [manual, setManual] = useState(false);
	const [status, setStatus] = useState("Procurando a balança…");
	const [conectado, setConectado] = useState(false);

	useEscapeFechaModal(true, onCancelar);

	const kg = useMemo(() => kgDeDigitos(digitos), [digitos]);
	const total = kg * produto.preco;

	const aplicarTeclado = useCallback((proximo: string) => {
		setManual(proximo !== "0");
		setDigitos(proximo);
	}, []);

	useEffect(() => {
		let ativo = true;
		async function poll() {
			if (!ativo || manual) return;
			try {
				const leitura = await pdvInvoke<BalancaPeso>("balanca.lerPeso");
				if (!ativo || manual) return;
				setConectado(leitura.conectado);
				setStatus(leitura.mensagem);
				if (leitura.peso > 0) {
					setDigitos(digitosDeKg(leitura.peso));
				}
			} catch (err) {
				if (!ativo) return;
				setConectado(false);
				setStatus(
					err instanceof Error
						? err.message
						: "Balança indisponível — informe o peso",
				);
			}
		}
		void poll();
		const timer = setInterval(() => void poll(), 400);
		return () => {
			ativo = false;
			clearInterval(timer);
		};
	}, [manual]);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "Enter") return;
			if (kg <= 0) return;
			e.preventDefault();
			onConfirmar(kg);
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [kg, onConfirmar]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="w-[26rem] space-y-4 rounded-lg border bg-card p-5">
				<div>
					<h2 className="text-lg font-semibold">Pesar produto</h2>
					<p className="text-sm text-muted-foreground">{produto.descricao}</p>
				</div>
				<div className="grid grid-cols-2 gap-2 rounded-md border bg-background px-3 py-2 text-sm">
					<div>
						<p className="text-xs text-muted-foreground">Preço / kg</p>
						<p className="font-semibold">{money(produto.preco)}</p>
					</div>
					<div className="text-right">
						<p className="text-xs text-muted-foreground">Peso</p>
						<p className="font-semibold tabular-nums">{formatarKg(kg)} kg</p>
					</div>
					<div className="col-span-2 border-t pt-2 text-right">
						<p className="text-xs text-muted-foreground">Total</p>
						<p className="text-xl font-bold text-primary">{money(total)}</p>
					</div>
				</div>
				<p
					className={
						conectado
							? "text-xs text-emerald-700"
							: "text-xs text-muted-foreground"
					}
				>
					{manual
						? "Peso informado no teclado. A leitura automática foi pausada."
						: status}
				</p>
				<NumericKeypad digits={digitos} onChange={aplicarTeclado} />
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						onClick={onCancelar}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						className="flex-1"
						disabled={kg <= 0}
						onClick={() => onConfirmar(kg)}
					>
						Confirmar
					</Button>
				</div>
			</div>
		</div>
	);
}
