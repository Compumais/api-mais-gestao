"use client";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
	value?: number;
}

function Progress({ className, value = 0, ...props }: ProgressProps) {
	const valor = Math.min(100, Math.max(0, value));

	return (
		<div
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={valor}
			className={cn(
				"relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
				className,
			)}
			{...props}
		>
			<div
				className="h-full bg-primary transition-all"
				style={{ width: `${valor}%` }}
			/>
		</div>
	);
}

export { Progress };
