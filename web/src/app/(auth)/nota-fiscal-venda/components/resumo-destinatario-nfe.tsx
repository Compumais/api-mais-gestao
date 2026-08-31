"use client";

import {
	type DadosDestinatarioNfe,
	montarCamposDestinatarioNfe,
} from "@/util/destinatario-nfe-util";
import { cn } from "@/lib/utils";

type ResumoDestinatarioNfeProps = {
	dados: DadosDestinatarioNfe;
	variant?: "card" | "compact";
};

export function ResumoDestinatarioNfe({
	dados,
	variant = "card",
}: ResumoDestinatarioNfeProps) {
	const campos = montarCamposDestinatarioNfe(dados);

	if (variant === "compact") {
		return (
			<div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
				{campos.map((campo) => (
					<div
						key={campo.label}
						className={cn(
							"min-w-0 overflow-hidden",
							campo.fullWidth && "sm:col-span-2 lg:col-span-3",
						)}
					>
						<span className="block text-xs font-medium uppercase text-muted-foreground">
							{campo.label}
						</span>
						<span
							className={cn(
								"break-all text-foreground",
								campo.mono && "font-mono",
							)}
						>
							{campo.valor}
						</span>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
			{campos.map((campo) => (
				<div
					key={campo.label}
					className={cn(
						"min-w-0 overflow-hidden",
						campo.fullWidth && "sm:col-span-2 lg:col-span-3",
					)}
				>
					<p className="text-xs font-medium uppercase text-muted-foreground">
						{campo.label}
					</p>
					<p className={cn("break-all", campo.mono && "font-mono")}>
						{campo.valor}
					</p>
				</div>
			))}
		</div>
	);
}
