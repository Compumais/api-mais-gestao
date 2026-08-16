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
	const mostrarImg = Boolean(src) && !falhou;

	useEffect(() => {
		setFalhou(false);
	}, [produto.id, src]);

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition hover:border-primary disabled:pointer-events-none disabled:opacity-50",
				destaque
					? "border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90"
					: "bg-background",
			)}
		>
			<div
				className={cn(
					"flex h-16 w-16 items-center justify-center overflow-hidden rounded-md",
					destaque ? "bg-primary-foreground/15" : "bg-muted",
				)}
			>
				{mostrarImg ? (
					<img
						src={src ?? undefined}
						alt=""
						className="h-full w-full object-cover"
						loading="lazy"
						onError={() => setFalhou(true)}
					/>
				) : (
					<PlaceholderIcon
						className={cn(
							"h-8 w-8 opacity-40",
							destaque ? "text-primary-foreground" : "text-muted-foreground",
						)}
					/>
				)}
			</div>
			<div
				className={cn(
					"line-clamp-2 w-full text-sm font-semibold",
					destaque ? "text-primary-foreground" : "",
				)}
			>
				{produto.descricao}
			</div>
			<div
				className={cn(
					"text-sm font-bold",
					destaque ? "text-primary-foreground" : "text-primary",
				)}
			>
				{money(produto.preco)}
			</div>
		</button>
	);
}
