"use client";

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatPercent } from "@/lib/dashboard-periodo";
import { cn } from "@/lib/utils";

type KpiCardProps = {
	titulo: string;
	valor: string;
	variacaoPeriodoAnteriorPct?: number | null;
	variacaoYoYPct?: number | null;
	subtitulo?: string;
	className?: string;
	onClick?: () => void;
};

function VariacaoBadge({
	label,
	valor,
}: {
	label: string;
	valor: number | null | undefined;
}) {
	if (valor === null || valor === undefined) return null;
	const positivo = valor >= 0;
	const Icon = positivo ? IconTrendingUp : IconTrendingDown;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 text-xs",
				positivo ? "text-emerald-600" : "text-red-600",
			)}
		>
			<Icon className="size-3.5" aria-hidden="true" />
			{label} {formatPercent(valor)}
		</span>
	);
}

export function KpiCard({
	titulo,
	valor,
	variacaoPeriodoAnteriorPct,
	variacaoYoYPct,
	subtitulo,
	className,
	onClick,
}: KpiCardProps) {
	const Wrapper = onClick ? "button" : "div";

	return (
		<Card
			className={cn(
				"@container/card",
				onClick && "cursor-pointer transition-shadow hover:shadow-md",
				className,
			)}
		>
			<Wrapper
				type={onClick ? "button" : undefined}
				onClick={onClick}
				className={onClick ? "w-full text-left" : undefined}
			>
				<CardHeader>
					<CardDescription>{titulo}</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{valor}
					</CardTitle>
				</CardHeader>
				{(subtitulo ||
					variacaoPeriodoAnteriorPct !== undefined ||
					variacaoYoYPct !== undefined) && (
					<CardFooter className="flex flex-col items-start gap-1 text-sm">
						{subtitulo ? (
							<span className="text-muted-foreground">{subtitulo}</span>
						) : null}
						<div className="flex flex-wrap gap-x-3 gap-y-1">
							<VariacaoBadge
								label="vs ant."
								valor={variacaoPeriodoAnteriorPct}
							/>
							<VariacaoBadge label="YoY" valor={variacaoYoYPct} />
						</div>
					</CardFooter>
				)}
			</Wrapper>
		</Card>
	);
}
