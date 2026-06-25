"use client";

import { cn } from "@/lib/utils";
import { NFE_STATUS, obterLabelStatus } from "@/constants/nfe-status";

interface StatusNfeBadgeProps {
	status: number | null | undefined;
	cStat?: string | number | null;
	xMotivo?: string | null;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const statusVariants: Record<number, string> = {
	[NFE_STATUS.PENDENTE]: "bg-gray-100 text-gray-700 border-gray-300",
	[NFE_STATUS.AUTORIZADA]: "bg-green-100 text-green-800 border-green-300",
	[NFE_STATUS.CANCELADA]: "bg-orange-100 text-orange-800 border-orange-300",
	[NFE_STATUS.CANCELADA_FORA_PRAZO]: "bg-orange-100 text-orange-800 border-orange-300",
	[NFE_STATUS.REJEITADA]: "bg-red-100 text-red-800 border-red-300",
	[NFE_STATUS.INUTILIZADA]: "bg-gray-100 text-gray-700 border-gray-300",
	[NFE_STATUS.DENEGADA]: "bg-purple-100 text-purple-800 border-purple-300",
};

const sizeVariants = {
	sm: "px-2 py-0.5 text-xs",
	md: "px-2.5 py-1 text-sm",
	lg: "px-3 py-1.5 text-base",
};

export function StatusNfeBadge({
	status,
	cStat,
	xMotivo,
	size = "md",
	className,
}: StatusNfeBadgeProps) {
	const codigoStatus = Number(status ?? NFE_STATUS.PENDENTE);
	const label = obterLabelStatus(codigoStatus);
	const variant =
		statusVariants[codigoStatus] ?? statusVariants[NFE_STATUS.PENDENTE];
	const codigoExibicao =
		cStat != null && String(cStat).trim() !== "" ? String(cStat).trim() : null;
	const motivo = xMotivo?.trim();

	const titulo =
		codigoExibicao || motivo
			? `Código: ${codigoExibicao ?? "—"}${motivo ? ` — ${motivo}` : ""}`
			: undefined;

	return (
		<span
			title={titulo}
			className={cn(
				"inline-flex items-center rounded-full border font-medium",
				variant,
				sizeVariants[size],
				className,
			)}
		>
			{label}
			{codigoExibicao && codigoStatus === NFE_STATUS.REJEITADA && (
				<span className="ml-1 opacity-70">({codigoExibicao})</span>
			)}
		</span>
	);
}
