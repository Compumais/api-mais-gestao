import type * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"span"> & {
	variant?:
		| "default"
		| "secondary"
		| "destructive"
		| "outline"
		| "success"
		| "warning";
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
				variant === "default" && "bg-primary text-primary-foreground",
				variant === "secondary" && "bg-secondary text-secondary-foreground",
				variant === "destructive" && "bg-destructive text-white",
				variant === "outline" && "border text-foreground",
				variant === "success" && "bg-emerald-100 text-emerald-800",
				variant === "warning" && "bg-amber-100 text-amber-900",
				className,
			)}
			{...props}
		/>
	);
}

export { Badge };
