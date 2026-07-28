"use client";

import { Badge } from "@/components/ui/badge";
import type { TipoOrdemServicoEvento } from "@/services/ordem-servico.service";
import { corContrasteTexto, obterTipoPorStatus } from "@/util/ordem-servico-ui";

type OrdemServicoStatusBadgeProps = {
	status: number | null | undefined;
	tipos?: TipoOrdemServicoEvento[];
	className?: string;
};

export function OrdemServicoStatusBadge({
	status,
	tipos = [],
	className,
}: OrdemServicoStatusBadgeProps) {
	const tipo = obterTipoPorStatus(tipos, status);
	const cor = tipo?.cor ?? "#E5E7EB";
	const label = tipo?.descricao ?? (status != null ? `Status ${status}` : "—");

	return (
		<Badge
			variant="outline"
			className={className}
			style={{
				backgroundColor: cor,
				color: corContrasteTexto(cor),
				borderColor: cor,
			}}
		>
			{label}
		</Badge>
	);
}
