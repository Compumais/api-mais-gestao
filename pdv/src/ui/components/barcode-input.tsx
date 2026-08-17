import { useEffect, useRef, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import type { ProdutoLocal } from "@/lib/pdv-types";
import { cn, money } from "@/lib/utils";

type BarcodeInputProps = {
	onScan: (codigo: string) => void;
	onProduto?: (produto: ProdutoLocal) => void;
	placeholder?: string;
	className?: string;
};

function pareceCodigoBarras(valor: string): boolean {
	return /^\d{8,}$/.test(valor);
}

/** Input sempre focado para leitura de leitor de código de barras (Enter dispara a busca). */
export function BarcodeInput({
	onScan,
	onProduto,
	placeholder = "Bipe o código, busque pelo nome ou pressione Enter...",
	className,
}: BarcodeInputProps) {
	const [valor, setValor] = useState("");
	const [resultados, setResultados] = useState<ProdutoLocal[]>([]);
	const [buscando, setBuscando] = useState(false);
	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		ref.current?.focus();
	}, []);

	useEffect(() => {
		if (!onProduto) {
			setResultados([]);
			return;
		}
		const termo = valor.trim();
		if (termo.length < 2 || pareceCodigoBarras(termo)) {
			setResultados([]);
			return;
		}
		const timer = window.setTimeout(() => {
			void (async () => {
				setBuscando(true);
				try {
					const lista = await pdvInvoke<ProdutoLocal[]>(
						"buscarProdutos",
						termo,
					);
					setResultados(lista);
				} catch {
					setResultados([]);
				} finally {
					setBuscando(false);
				}
			})();
		}, 250);
		return () => window.clearTimeout(timer);
	}, [valor, onProduto]);

	function refocar() {
		window.setTimeout(() => ref.current?.focus(), 50);
	}

	function escolherProduto(produto: ProdutoLocal) {
		onProduto?.(produto);
		setValor("");
		setResultados([]);
		refocar();
	}

	async function confirmar() {
		const codigo = valor.trim();
		if (!codigo) return;

		if (onProduto && !pareceCodigoBarras(codigo) && !/^\d+$/.test(codigo)) {
			let lista = resultados;
			if (lista.length === 0) {
				try {
					lista = await pdvInvoke<ProdutoLocal[]>("buscarProdutos", codigo);
					setResultados(lista);
				} catch {
					lista = [];
				}
			}
			const unico = lista[0];
			if (lista.length === 1 && unico) {
				escolherProduto(unico);
				return;
			}
			if (lista.length > 1) {
				return;
			}
		}

		onScan(codigo);
		setValor("");
		setResultados([]);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") {
			e.preventDefault();
			void confirmar();
		}
	}

	return (
		<div className="relative">
			<input
				ref={ref}
				value={valor}
				onChange={(e) => setValor(e.target.value)}
				onKeyDown={onKeyDown}
				onBlur={refocar}
				placeholder={placeholder}
				autoComplete="off"
				className={cn(
					"flex h-11 w-full rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					className,
				)}
			/>
			{onProduto &&
			valor.trim().length >= 2 &&
			!pareceCodigoBarras(valor.trim()) ? (
				<div className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-md">
					{buscando && resultados.length === 0 ? (
						<p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
					) : resultados.length === 0 ? (
						<p className="px-3 py-2 text-xs text-muted-foreground">
							Nenhum produto com esse nome.
						</p>
					) : (
						<ul>
							{resultados.map((p) => (
								<li key={p.id}>
									<button
										type="button"
										className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => escolherProduto(p)}
									>
										<span className="min-w-0 truncate font-medium">
											{p.descricao}
										</span>
										<span className="shrink-0 text-xs text-muted-foreground">
											{money(p.preco)}
											{p.codigo ? ` · ${p.codigo}` : ""}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			) : null}
		</div>
	);
}
