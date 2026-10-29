import { Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import type { LayoutCatalogoProdutos } from "@/lib/catalogo-layout";
import { resolverSrcImagemProduto } from "@/lib/produto-imagem";
import type { ProdutoLocal } from "@/lib/pdv-types";
import { cn, money } from "@/lib/utils";

type ProdutoCardProps = {
	produto: ProdutoLocal;
	onClick: () => void;
	disabled?: boolean;
	destaque?: boolean;
	/** grade = card atual; lista = linha compacta. */
	variante?: LayoutCatalogoProdutos;
};

function PlaceholderIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			fill="currentColor"
			aria-hidden
		>
			<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
		</svg>
	);
}

function Miniatura({
	src,
	falhou,
	carregou,
	onLoad,
	onError,
	destaque,
	tamanho,
}: {
	src: string | null;
	falhou: boolean;
	carregou: boolean;
	onLoad: () => void;
	onError: () => void;
	destaque?: boolean;
	tamanho: "grade" | "lista";
}) {
	const mostrarImg = Boolean(src) && !falhou;
	const caixa =
		tamanho === "lista"
			? "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
			: "relative flex h-28 w-full items-center justify-center overflow-hidden";

	return (
		<div
			className={cn(
				caixa,
				destaque ? "bg-primary-foreground/15" : "bg-muted",
			)}
		>
			{!mostrarImg || !carregou ? (
				<PlaceholderIcon
					className={cn(
						tamanho === "lista" ? "h-6 w-6 opacity-35" : "h-10 w-10 opacity-35",
						destaque ? "text-primary-foreground" : "text-muted-foreground",
					)}
				/>
			) : null}
			{mostrarImg ? (
				<img
					src={src ?? undefined}
					alt=""
					className={cn(
						"absolute inset-0 h-full w-full object-cover transition duration-200",
						tamanho === "grade" && "group-hover:scale-105",
						carregou ? "opacity-100" : "opacity-0",
					)}
					loading="lazy"
					onLoad={onLoad}
					onError={onError}
				/>
			) : null}
			{destaque && tamanho === "grade" ? (
				<span className="absolute left-2 top-2 rounded-full bg-primary-foreground/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
					Atalho
				</span>
			) : null}
		</div>
	);
}

/** Card de produto/atalho — grade (miniatura grande) ou lista (linha). */
export function ProdutoCard({
	produto,
	onClick,
	disabled,
	destaque,
	variante = "grade",
}: ProdutoCardProps) {
	const src = resolverSrcImagemProduto(produto);
	const [falhou, setFalhou] = useState(false);
	const [carregou, setCarregou] = useState(false);

	useEffect(() => {
		setFalhou(false);
		setCarregou(false);
	}, [produto.id, src]);

	const codigo =
		produto.codigo != null
			? `Cód. ${produto.codigo}`
			: produto.ean
				? `EAN ${produto.ean}`
				: null;

	if (variante === "lista") {
		return (
			<button
				type="button"
				disabled={disabled}
				onClick={onClick}
				className={cn(
					"group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ring-1 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
					destaque
						? "bg-primary text-primary-foreground ring-primary hover:bg-primary/90"
						: "bg-background ring-foreground/12 hover:ring-primary",
				)}
			>
				<Miniatura
					src={src}
					falhou={falhou}
					carregou={carregou}
					destaque={destaque}
					tamanho="lista"
					onLoad={() => setCarregou(true)}
					onError={() => {
						setCarregou(false);
						setFalhou(true);
					}}
				/>
				<div className="min-w-0 flex-1">
					<div
						className={cn(
							"truncate text-sm font-semibold",
							destaque ? "text-primary-foreground" : "text-foreground",
						)}
					>
						{produto.descricao}
					</div>
					<div
						className={cn(
							"mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px]",
							destaque
								? "text-primary-foreground/70"
								: "text-muted-foreground",
						)}
					>
						{destaque ? <span className="font-semibold uppercase">Atalho</span> : null}
						{codigo ? <span>{codigo}</span> : null}
					</div>
				</div>
				<div
					className={cn(
						"shrink-0 text-right text-sm font-bold tabular-nums",
						destaque ? "text-primary-foreground" : "text-primary",
					)}
				>
					{money(produto.preco)}
				</div>
				<span
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-lg",
						destaque
							? "bg-primary-foreground text-primary"
							: "bg-primary text-primary-foreground",
					)}
					aria-hidden
				>
					{destaque ? (
						<ShoppingBag className="size-3.5" />
					) : (
						<Plus className="size-4" />
					)}
				</span>
			</button>
		);
	}

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"group flex min-h-56 flex-col overflow-hidden rounded-xl text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
				destaque
					? "bg-primary text-primary-foreground ring-primary hover:bg-primary/90"
					: "bg-background ring-foreground/15 hover:ring-primary",
			)}
		>
			<Miniatura
				src={src}
				falhou={falhou}
				carregou={carregou}
				destaque={destaque}
				tamanho="grade"
				onLoad={() => setCarregou(true)}
				onError={() => {
					setCarregou(false);
					setFalhou(true);
				}}
			/>
			<div className="flex w-full flex-1 flex-col p-3">
				<div
					className={cn(
						"line-clamp-2 min-h-10 w-full text-sm font-semibold leading-tight",
						destaque ? "text-primary-foreground" : "text-foreground",
					)}
				>
					{produto.descricao}
				</div>
				<div
					className={cn(
						"mt-1 min-h-4 truncate text-[11px]",
						destaque
							? "text-primary-foreground/70"
							: "text-muted-foreground",
					)}
				>
					{codigo}
				</div>
				<div className="mt-auto flex items-end justify-between gap-2 pt-3">
					<div>
						<div
							className={cn(
								"text-[10px] font-medium uppercase tracking-wide",
								destaque
									? "text-primary-foreground/65"
									: "text-muted-foreground",
							)}
						>
							Preço
						</div>
						<div
							className={cn(
								"text-base font-bold",
								destaque ? "text-primary-foreground" : "text-primary",
							)}
						>
							{money(produto.preco)}
						</div>
					</div>
					<span
						className={cn(
							"flex size-9 shrink-0 items-center justify-center rounded-lg transition",
							destaque
								? "bg-primary-foreground text-primary"
								: "bg-primary text-primary-foreground group-hover:bg-primary/90",
						)}
						aria-hidden
					>
						{destaque ? (
							<ShoppingBag className="size-4" />
						) : (
							<Plus className="size-5" />
						)}
					</span>
				</div>
			</div>
		</button>
	);
}
