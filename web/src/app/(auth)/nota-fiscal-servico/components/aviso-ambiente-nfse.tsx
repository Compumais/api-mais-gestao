"use client";

import { Badge } from "@/components/ui/badge";
import { NFSE_AMBIENTE_LABELS } from "@/constants/nfse-emissao";

export function AvisoAmbienteNfse({ ambiente }: { ambiente?: number | null }) {
	if (ambiente !== 2) return null;

	const label = NFSE_AMBIENTE_LABELS[ambiente] ?? `Ambiente ${ambiente}`;

	return <Badge variant="secondary">NFS-e — {label}</Badge>;
}
