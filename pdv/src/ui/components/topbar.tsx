import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type TopbarProps = {
	title: string;
	subtitle?: string | null;
	right?: ReactNode;
};

export function Topbar({ title, subtitle, right }: TopbarProps) {
	const [agora, setAgora] = useState(new Date());

	useEffect(() => {
		const id = setInterval(() => setAgora(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	return (
		<header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-primary px-4 text-primary-foreground shadow-sm">
			<div className="min-w-0">
				<div className="truncate text-sm font-semibold tracking-tight">
					{title}
				</div>
				{subtitle && (
					<div className="truncate text-[0.65rem] opacity-80">{subtitle}</div>
				)}
			</div>
			<div className="flex items-center gap-4">
				{right}
				<div className="text-right leading-tight">
					<div className="text-sm font-semibold tabular-nums">
						{agora.toLocaleTimeString("pt-BR")}
					</div>
					<div className="text-[0.65rem] opacity-80">
						{agora.toLocaleDateString("pt-BR")}
					</div>
				</div>
			</div>
		</header>
	);
}
