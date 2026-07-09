"use client";

import { Badge } from "@/components/ui/badge";
import { NFSE_AMBIENTE_LABELS } from "@/constants/nfse-emissao";

export function AvisoAmbienteNfse({ ambiente }: { ambiente?: number | null }) {
	if (!ambiente) return null;

	const label = NFSE_AMBIENTE_LABELS[ambiente] ?? `Ambiente ${ambiente}`;
	const producao = ambiente === 1;

	return (
		<Badge variant={producao ? "destructive" : "secondary"}>
			NFS-e — {label}
		</Badge>
	);
}
