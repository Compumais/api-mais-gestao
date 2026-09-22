import type { ComponentType } from "react";
import { useEffect } from "react";
import { teclaCorresponde } from "@/lib/teclas-funcao";
import { cn } from "@/lib/utils";

export type FunctionBarAction = {
	key: string;
	label: string;
	hotkey?: string;
	icon?: ComponentType<{ className?: string }>;
	variant?: "default" | "secondary" | "destructive" | "outline" | "success";
	onClick: () => void;
	disabled?: boolean;
};

const variantClasses: Record<
	NonNullable<FunctionBarAction["variant"]>,
	string
> = {
	default: "bg-primary text-primary-foreground hover:bg-primary/80",
	secondary:
		"border border-border/80 bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)]",
	destructive:
		"border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
	success: "bg-success text-success-foreground hover:bg-success/88",
	outline: "border border-border bg-background text-foreground hover:bg-muted",
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
		<div className="flex shrink-0 items-stretch gap-1 border-t border-border bg-card p-1.5 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
			{actions.map((action) => {
				const Icon = action.icon;
				return (
					<button
						key={action.key}
						type="button"
						disabled={action.disabled}
						onClick={action.onClick}
						className={cn(
							"pdv-touch flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-center transition-colors disabled:pointer-events-none disabled:opacity-55",
							variantClasses[action.variant ?? "outline"],
						)}
					>
						{Icon ? <Icon className="size-4 shrink-0" /> : null}
						<span className="truncate text-[11px] font-semibold leading-tight">
							{action.label}
						</span>
						{action.hotkey && (
							<kbd className="ml-auto hidden rounded border border-current/15 bg-black/5 px-1 py-0.5 text-[9px] font-bold uppercase opacity-70 xl:inline">
								{action.hotkey}
							</kbd>
						)}
					</button>
				);
			})}
		</div>
	);
}
