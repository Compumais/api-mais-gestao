"use client";

import {
	type DadosDestinatarioNfe,
	montarCamposDestinatarioNfe,
} from "@/util/destinatario-nfe-util";

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
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
				{campos.map((campo) => (
					<div
						key={campo.label}
						className={campo.fullWidth ? "sm:col-span-2 lg:col-span-3" : undefined}
					>
						<span className="text-xs font-medium uppercase text-muted-foreground block">
							{campo.label}
						</span>
						<span
							className={
								campo.mono
									? "font-mono text-foreground"
									: "text-foreground"
							}
						>
							{campo.valor}
						</span>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
			{campos.map((campo) => (
				<div
					key={campo.label}
					className={campo.fullWidth ? "sm:col-span-2 lg:col-span-3" : undefined}
				>
					<p className="text-muted-foreground text-xs font-medium uppercase">
						{campo.label}
					</p>
					<p className={campo.mono ? "font-mono" : undefined}>{campo.valor}</p>
				</div>
			))}
		</div>
	);
}
