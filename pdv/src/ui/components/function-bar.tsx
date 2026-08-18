import { useEffect } from "react";
import { teclaCorresponde } from "@/lib/teclas-funcao";
import { cn } from "@/lib/utils";

export type FunctionBarAction = {
	key: string;
	label: string;
	hotkey?: string;
	variant?: "default" | "secondary" | "destructive" | "outline";
	onClick: () => void;
	disabled?: boolean;
};

const variantClasses: Record<
	NonNullable<FunctionBarAction["variant"]>,
	string
> = {
	default: "bg-primary text-primary-foreground hover:bg-primary/90",
	secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
	destructive: "bg-destructive text-white hover:bg-destructive/90",
	outline: "border bg-background hover:bg-accent hover:text-accent-foreground",
};

/** Barra inferior estilo Uniplus: botões com atalho (F-key) em cima e rótulo embaixo. */
export function FunctionBar({ actions }: { actions: FunctionBarAction[] }) {
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			// Escape é reservado ao voltar global (GlobalEscapeBack).
			if (e.key === "Escape") return;
			const action = actions.find(
				(a) => a.hotkey && teclaCorresponde(e, a.hotkey),
			);
			if (action && !action.disabled && !e.defaultPrevented) {
				e.preventDefault();
				action.onClick();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [actions]);

	return (
		<div className="flex shrink-0 gap-1.5 border-t bg-card p-1.5">
			{actions.map((action) => (
				<button
					key={action.key}
					type="button"
					disabled={action.disabled}
					onClick={action.onClick}
					className={cn(
						"flex min-w-20 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-center transition-colors disabled:pointer-events-none disabled:opacity-40",
						variantClasses[action.variant ?? "outline"],
					)}
				>
					{action.hotkey && (
						<span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
							{action.hotkey}
						</span>
					)}
					<span className="text-xs font-medium leading-tight">
						{action.label}
					</span>
				</button>
			))}
		</div>
	);
}
