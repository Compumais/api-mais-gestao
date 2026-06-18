import { cn } from "@/lib/utils";

interface GrupoImagemProps {
	src?: string | null;
	nome: string;
	size?: "chip" | "header" | "banner";
	className?: string;
}

const sizeClasses = {
	chip: "size-6",
	header: "size-10",
	banner: "size-12",
} as const;

export function GrupoImagem({
	src,
	nome,
	size = "chip",
	className,
}: GrupoImagemProps) {
	if (!src) return null;

	return (
		<img
			src={src}
			alt={nome}
			className={cn(
				"shrink-0 object-cover",
				size === "chip" ? "rounded-full" : "rounded-lg",
				sizeClasses[size],
				className,
			)}
		/>
	);
}
