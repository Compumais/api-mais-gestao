import { useEffect, useRef, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import type { ProdutoLocal } from "@/lib/pdv-types";
import { cn, money } from "@/lib/utils";

type BarcodeInputProps = {
	onScan: (codigo: string) => void;
	onProduto?: (produto: ProdutoLocal) => void;
	placeholder?: string;
	className?: string;
	/** Quando um modal está aberto, não recaptura o foco nem trata teclas. */
	pausado?: boolean;
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
	pausado = false,
}: BarcodeInputProps) {
	const [valor, setValor] = useState("");
	const [resultados, setResultados] = useState<ProdutoLocal[]>([]);
	const [indiceAtivo, setIndiceAtivo] = useState(0);
	const [buscando, setBuscando] = useState(false);
	const ref = useRef<HTMLInputElement>(null);
	const itemAtivoRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		if (pausado) return;
		ref.current?.focus();
	}, [pausado]);

	useEffect(() => {
		if (!onProduto || pausado) {
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
					setIndiceAtivo(0);
				} catch {
					setResultados([]);
				} finally {
					setBuscando(false);
				}
			})();
		}, 250);
		return () => window.clearTimeout(timer);
	}, [valor, onProduto, pausado]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: o botão ativo está num ref atualizado no render
	useEffect(() => {
		itemAtivoRef.current?.scrollIntoView({ block: "nearest" });
	}, [indiceAtivo, resultados]);

	function refocar() {
		if (pausado) return;
		window.setTimeout(() => {
			if (pausado) return;
			ref.current?.focus();
		}, 50);
	}

	function escolherProduto(produto: ProdutoLocal) {
		onProduto?.(produto);
		setValor("");
		setResultados([]);
		setIndiceAtivo(0);
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
					setIndiceAtivo(0);
				} catch {
					lista = [];
				}
			}
			const destacado = lista[indiceAtivo] ?? lista[0];
			if (destacado && lista.length >= 1) {
				escolherProduto(destacado);
				return;
			}
		}

		onScan(codigo);
		setValor("");
		setResultados([]);
		setIndiceAtivo(0);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (pausado) return;

		if (e.key === "ArrowDown" && resultados.length > 0) {
			e.preventDefault();
			setIndiceAtivo((i) => Math.min(i + 1, resultados.length - 1));
			return;
		}
		if (e.key === "ArrowUp" && resultados.length > 0) {
			e.preventDefault();
			setIndiceAtivo((i) => Math.max(i - 1, 0));
			return;
		}
		if (e.key === "Enter" || e.code === "NumpadEnter") {
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
				disabled={pausado}
				className={cn(
					"flex h-11 w-full rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					className,
				)}
			/>
			{onProduto &&
			!pausado &&
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
							{resultados.map((p, indice) => (
								<li key={p.id}>
									<button
										type="button"
										ref={indice === indiceAtivo ? itemAtivoRef : undefined}
										className={cn(
											"flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
											indice === indiceAtivo
												? "bg-primary/30 font-medium text-primary ring-2 ring-primary"
												: "hover:bg-primary/15",
										)}
										onMouseDown={(e) => e.preventDefault()}
										onMouseEnter={() => setIndiceAtivo(indice)}
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
