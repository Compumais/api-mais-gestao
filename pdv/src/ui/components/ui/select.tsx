import type * as React from "react";
import { cn } from "@/lib/utils";

function Select({
	className,
	children,
	...props
}: React.ComponentProps<"select">) {
	return (
		<select
			className={cn(
				"flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			{children}
		</select>
	);
}

export { Select };
