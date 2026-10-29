import { ImageOff, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";
import type { GrupoLocal } from "@/lib/pdv-types";
import { cn } from "@/lib/utils";

type GrupoGourmetCardProps = {
	grupo: GrupoLocal;
	onClick: () => void;
	disabled?: boolean;
};

export function GrupoGourmetCard({
	grupo,
	onClick,
	disabled,
}: GrupoGourmetCardProps) {
	const [imagemFalhou, setImagemFalhou] = useState(false);
	const src = grupo.caminhoimagem?.trim() || null;

	// biome-ignore lint/correctness/useExhaustiveDependencies: uma nova imagem deve poder substituir uma falha anterior
	useEffect(() => {
		setImagemFalhou(false);
	}, [grupo.id, src]);

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="group flex h-16 w-44 shrink-0 items-center gap-2.5 overflow-hidden rounded-xl bg-background p-2 text-left ring-1 ring-foreground/15 transition hover:bg-primary/5 hover:shadow-sm hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
		>
			<div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
				{src && !imagemFalhou ? (
					<img
						src={src}
						alt=""
						className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
						loading="lazy"
						onError={() => setImagemFalhou(true)}
					/>
				) : (
					<div className="flex items-center justify-center text-muted-foreground/60">
						{imagemFalhou ? (
							<ImageOff className="size-5" aria-hidden />
						) : (
							<UtensilsCrossed className="size-5" aria-hidden />
						)}
					</div>
				)}
				<div
					className={cn(
						"pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent",
						(!src || imagemFalhou) && "hidden",
					)}
				/>
			</div>
			<span className="min-w-0 flex-1">
				<span className="line-clamp-2 text-xs font-semibold leading-tight">
					{grupo.nome}
				</span>
			</span>
		</button>
	);
}
