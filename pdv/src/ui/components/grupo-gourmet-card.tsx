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
			className="group flex min-h-36 flex-col overflow-hidden rounded-xl bg-background text-left ring-1 ring-foreground/15 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
		>
			<div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-muted">
				{src && !imagemFalhou ? (
					<img
						src={src}
						alt=""
						className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
						loading="lazy"
						onError={() => setImagemFalhou(true)}
					/>
				) : (
					<div className="flex flex-col items-center gap-1 text-muted-foreground/60">
						{imagemFalhou ? (
							<ImageOff className="size-8" aria-hidden />
						) : (
							<UtensilsCrossed className="size-8" aria-hidden />
						)}
						<span className="text-[10px] font-medium uppercase tracking-wide">
							Sem imagem
						</span>
					</div>
				)}
				<div
					className={cn(
						"pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent",
						(!src || imagemFalhou) && "hidden",
					)}
				/>
			</div>
			<span className="flex min-h-12 w-full items-center px-3 py-2 text-sm font-semibold leading-tight">
				<span className="line-clamp-2">{grupo.nome}</span>
			</span>
		</button>
	);
}
