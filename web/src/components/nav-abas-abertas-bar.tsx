"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavAbasAbertasOpcional } from "@/hooks/use-nav-abas-abertas";
import { cn } from "@/lib/utils";

type Variante = "topbar" | "sidebar";

export function NavAbasAbertasBar({
	variante = "topbar",
}: {
	variante?: Variante;
}) {
	const ctx = useNavAbasAbertasOpcional();
	const scrollerRef = useRef<HTMLDivElement>(null);
	const [podeEsquerda, setPodeEsquerda] = useState(false);
	const [podeDireita, setPodeDireita] = useState(false);

	const atualizarSetas = () => {
		const el = scrollerRef.current;
		if (!el) {
			setPodeEsquerda(false);
			setPodeDireita(false);
			return;
		}
		setPodeEsquerda(el.scrollLeft > 2);
		setPodeDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
	};

	useEffect(() => {
		atualizarSetas();
		const el = scrollerRef.current;
		if (!el) return;
		el.addEventListener("scroll", atualizarSetas, { passive: true });
		const ro = new ResizeObserver(atualizarSetas);
		ro.observe(el);
		return () => {
			el.removeEventListener("scroll", atualizarSetas);
			ro.disconnect();
		};
	}, [ctx?.abas.length]);

	useEffect(() => {
		if (!ctx) return;
		const el = scrollerRef.current;
		if (!el) return;
		const ativa = el.querySelector<HTMLElement>('[data-aba-ativa="true"]');
		ativa?.scrollIntoView({
			behavior: "smooth",
			inline: "nearest",
			block: "nearest",
		});
	}, [ctx?.ativaId, ctx?.abas.length]);

	if (!ctx || ctx.abas.length === 0) return null;

	const { abas, ativaId, ativarAba, fecharAba } = ctx;
	const isTopbar = variante === "topbar";

	const rolar = (dir: -1 | 1) => {
		scrollerRef.current?.scrollBy({ left: dir * 180, behavior: "smooth" });
	};

	return (
		<div
			className={cn(
				"flex h-9 shrink-0 items-center gap-1 px-1.5 sm:px-2",
				isTopbar
					? "border-t border-primary-foreground/15 bg-black/20"
					: "border-b bg-muted/60",
			)}
			role="tablist"
			aria-label="Abas abertas"
		>
			<button
				type="button"
				className={cn(
					"inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-30",
					isTopbar
						? "text-primary-foreground/80 hover:bg-primary-foreground/10"
						: "text-muted-foreground hover:bg-muted hover:text-foreground",
				)}
				aria-label="Rolar abas para a esquerda"
				disabled={!podeEsquerda}
				onClick={() => rolar(-1)}
			>
				<ChevronLeft className="size-4" />
			</button>

			<div
				ref={scrollerRef}
				className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{abas.map((aba) => {
					const ativa = aba.id === ativaId;
					return (
						<div
							key={aba.id}
							role="tab"
							aria-selected={ativa}
							data-aba-ativa={ativa ? "true" : undefined}
							className={cn(
								"group flex h-7 max-w-56 shrink-0 items-center gap-1 rounded-md px-2 text-[0.7rem] font-semibold uppercase tracking-wide transition-colors",
								ativa
									? isTopbar
										? "bg-background text-foreground shadow-sm"
										: "bg-foreground text-background"
									: isTopbar
										? "bg-primary-foreground/15 text-primary-foreground/90 hover:bg-primary-foreground/25"
										: "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground",
							)}
						>
							<button
								type="button"
								className="min-w-0 truncate text-left"
								title={aba.title}
								onClick={() => {
									if (!ativa) ativarAba(aba.href);
								}}
							>
								{aba.title}
							</button>
							<button
								type="button"
								className={cn(
									"inline-flex size-4 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100",
									ativa
										? "hover:bg-foreground/10"
										: isTopbar
											? "hover:bg-primary-foreground/20"
											: "hover:bg-muted",
								)}
								aria-label={`Fechar aba ${aba.title}`}
								onClick={(event) => {
									event.stopPropagation();
									fecharAba(aba.id);
								}}
							>
								<X className="size-3" />
							</button>
						</div>
					);
				})}
			</div>

			<button
				type="button"
				className={cn(
					"inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-30",
					isTopbar
						? "text-primary-foreground/80 hover:bg-primary-foreground/10"
						: "text-muted-foreground hover:bg-muted hover:text-foreground",
				)}
				aria-label="Rolar abas para a direita"
				disabled={!podeDireita}
				onClick={() => rolar(1)}
			>
				<ChevronRight className="size-4" />
			</button>
		</div>
	);
}
