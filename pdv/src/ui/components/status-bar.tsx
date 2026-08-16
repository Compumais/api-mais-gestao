import { cn } from "@/lib/utils";

export type StatusBarItem = {
	label: string;
	value: string | number;
	tone?: "default" | "success" | "warning" | "destructive";
};

const toneClasses: Record<NonNullable<StatusBarItem["tone"]>, string> = {
	default: "text-foreground",
	success: "text-emerald-700",
	warning: "text-amber-700",
	destructive: "text-destructive",
};

export function StatusBar({ items }: { items: StatusBarItem[] }) {
	return (
		<div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 border-t bg-secondary/50 px-4 py-1.5 text-xs">
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-1.5">
					<span className="text-muted-foreground">{item.label}</span>
					<span
						className={cn("font-semibold", toneClasses[item.tone ?? "default"])}
					>
						{item.value}
					</span>
				</div>
			))}
		</div>
	);
}
