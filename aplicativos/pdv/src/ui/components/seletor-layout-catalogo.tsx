import { LayoutGrid, List } from "lucide-react";
import type { LayoutCatalogoProdutos } from "@/lib/catalogo-layout";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";

type SeletorLayoutCatalogoProps = {
	valor: LayoutCatalogoProdutos;
	onChange: (layout: LayoutCatalogoProdutos) => void;
	disabled?: boolean;
	className?: string;
};

/** Alterna entre grade (cards) e lista compacta no catálogo. */
export function SeletorLayoutCatalogo({
	valor,
	onChange,
	disabled,
	className,
}: SeletorLayoutCatalogoProps) {
	return (
		<div
			className={cn(
				"inline-flex items-center rounded-lg border border-foreground/10 bg-muted/40 p-0.5",
				className,
			)}
			role="group"
			aria-label="Modo de listagem dos produtos"
		>
			<Button
				type="button"
				size="sm"
				variant={valor === "grade" ? "default" : "ghost"}
				className="h-8 gap-1.5 px-2.5"
				disabled={disabled}
				aria-pressed={valor === "grade"}
				onClick={() => onChange("grade")}
			>
				<LayoutGrid className="size-4" />
				<span className="hidden sm:inline">Grade</span>
			</Button>
			<Button
				type="button"
				size="sm"
				variant={valor === "lista" ? "default" : "ghost"}
				className="h-8 gap-1.5 px-2.5"
				disabled={disabled}
				aria-pressed={valor === "lista"}
				onClick={() => onChange("lista")}
			>
				<List className="size-4" />
				<span className="hidden sm:inline">Lista</span>
			</Button>
		</div>
	);
}
