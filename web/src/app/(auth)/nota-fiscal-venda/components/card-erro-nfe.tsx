"use client";

import { AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export type CardErroNfeProps = {
	titulo: string;
	motivo: string;
	codigo?: string | null;
	instrucao?: string | null;
	className?: string;
};

export function CardErroNfe({
	titulo,
	motivo,
	codigo,
	instrucao,
	className,
}: CardErroNfeProps) {
	return (
		<div
			className={`rounded-lg border border-red-300 bg-red-50 p-4 space-y-3 ${className ?? ""}`}
		>
			<div className="flex items-center gap-2 text-red-800">
				<AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
				<span className="font-semibold">{titulo}</span>
			</div>

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{codigo != null && codigo !== "" && (
					<div>
						<p className="text-xs text-red-600 font-medium uppercase tracking-wide">
							Código
						</p>
						<p className="text-sm font-mono text-red-800">{codigo}</p>
					</div>
				)}
				<div className={codigo != null && codigo !== "" ? undefined : "sm:col-span-2"}>
					<p className="text-xs text-red-600 font-medium uppercase tracking-wide">
						Motivo
					</p>
					<p className="text-sm text-red-800 whitespace-pre-wrap">{motivo || "—"}</p>
				</div>
			</div>

			{instrucao ? (
				<>
					<Separator className="border-red-200" />
					<div>
						<p className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">
							Como corrigir
						</p>
						<p className="text-sm text-red-700">{instrucao}</p>
					</div>
				</>
			) : null}
		</div>
	);
}
