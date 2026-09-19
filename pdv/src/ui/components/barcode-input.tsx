import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	type EstadoBuscaProdutos,
	pareceCodigoBarras,
	podeBuscarProdutos,
	termoBuscaProduto,
} from "@/lib/catalogo-produtos";
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
	/** Exibe os resultados no catálogo da tela, em vez da lista flutuante. */
	resultadosExternos?: boolean;
	onBuscaChange?: (estado: EstadoBuscaProdutos) => void;
};

/** Input sempre focado para leitura de leitor de código de barras (Enter dispara a busca). */
export function BarcodeInput({
	onScan,
	onProduto,
	placeholder = "Bipe o código, busque pelo nome ou pressione Enter...",
	className,
	pausado = false,
	resultadosExternos = false,
	onBuscaChange,
}: BarcodeInputProps) {
	const [valor, setValor] = useState("");
	const [resultados, setResultados] = useState<ProdutoLocal[]>([]);
	const [indiceAtivo, setIndiceAtivo] = useState(0);
	const [buscando, setBuscando] = useState(false);
	const ref = useRef<HTMLInputElement>(null);
	const itemAtivoRef = useRef<HTMLButtonElement | null>(null);
	const onBuscaChangeRef = useRef(onBuscaChange);
	const buscaHabilitada = Boolean(onProduto) && !pausado;

	useEffect(() => {
		onBuscaChangeRef.current = onBuscaChange;
	}, [onBuscaChange]);

	useEffect(() => {
		onBuscaChangeRef.current?.({
			termo: termoBuscaProduto(valor),
			produtos: resultados,
			buscando,
		});
	}, [valor, resultados, buscando]);

	useEffect(() => {
		if (pausado) return;
		ref.current?.focus();
	}, [pausado]);

	useEffect(() => {
		if (!buscaHabilitada) {
			setResultados([]);
			setBuscando(false);
			return;
		}
		const termo = valor.trim();
		if (!podeBuscarProdutos(termo)) {
			setResultados([]);
			setBuscando(false);
			return;
		}
		let ativo = true;
		const timer = window.setTimeout(() => {
			void (async () => {
				setBuscando(true);
				try {
					const lista = await pdvInvoke<ProdutoLocal[]>(
						"buscarProdutos",
						termo,
					);
					if (ativo) {
						setResultados(lista);
						setIndiceAtivo(0);
					}
				} catch {
					if (ativo) setResultados([]);
				} finally {
					if (ativo) setBuscando(false);
				}
			})();
		}, 250);
		return () => {
			ativo = false;
			window.clearTimeout(timer);
		};
	}, [valor, buscaHabilitada]);

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

	function alterarValor(novoValor: string) {
		setValor(novoValor);
		setResultados([]);
		setBuscando(podeBuscarProdutos(novoValor));
		setIndiceAtivo(0);
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

		if (!resultadosExternos && e.key === "ArrowDown" && resultados.length > 0) {
			e.preventDefault();
			setIndiceAtivo((i) => Math.min(i + 1, resultados.length - 1));
			return;
		}
		if (!resultadosExternos && e.key === "ArrowUp" && resultados.length > 0) {
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
			<Search
				className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden
			/>
			<input
				ref={ref}
				value={valor}
				onChange={(e) => alterarValor(e.target.value)}
				onKeyDown={onKeyDown}
				onBlur={refocar}
				placeholder={placeholder}
				autoComplete="off"
				disabled={pausado}
				className={cn(
					"flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
					className,
				)}
			/>
			{onProduto &&
			!pausado &&
			!resultadosExternos &&
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
