import { Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { resolverSrcImagemProduto } from "@/lib/produto-imagem";
import type { ProdutoLocal } from "@/lib/pdv-types";
import { cn, money } from "@/lib/utils";

type ProdutoCardProps = {
	produto: ProdutoLocal;
	onClick: () => void;
	disabled?: boolean;
	destaque?: boolean;
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

/** Card de produto/atalho com miniatura (placeholder se sem imagem). */
export function ProdutoCard({
	produto,
	onClick,
	disabled,
	destaque,
}: ProdutoCardProps) {
	const src = resolverSrcImagemProduto(produto);
	const [falhou, setFalhou] = useState(false);
	const [carregou, setCarregou] = useState(false);
	const mostrarImg = Boolean(src) && !falhou;

	useEffect(() => {
		setFalhou(false);
		setCarregou(false);
	}, [produto.id, src]);

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
			<div
				className={cn(
					"relative flex h-28 w-full items-center justify-center overflow-hidden",
					destaque ? "bg-primary-foreground/15" : "bg-muted",
				)}
			>
				{!mostrarImg || !carregou ? (
					<PlaceholderIcon
						className={cn(
							"h-10 w-10 opacity-35",
							destaque ? "text-primary-foreground" : "text-muted-foreground",
						)}
					/>
				) : null}
				{mostrarImg ? (
					<img
						src={src ?? undefined}
						alt=""
						className={cn(
							"absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-105",
							carregou ? "opacity-100" : "opacity-0",
						)}
						loading="lazy"
						onLoad={() => setCarregou(true)}
						onError={() => {
							setCarregou(false);
							setFalhou(true);
						}}
					/>
				) : null}
				{destaque ? (
					<span className="absolute left-2 top-2 rounded-full bg-primary-foreground/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
						Atalho
					</span>
				) : null}
			</div>
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
					{produto.codigo != null
						? `Cód. ${produto.codigo}`
						: produto.ean
							? `EAN ${produto.ean}`
							: null}
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
