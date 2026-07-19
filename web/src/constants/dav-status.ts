export const DAV_STATUS = {
	ABERTO: 0,
	FECHADO: 1,
	PASSOU_CAIXA: 2,
	CANCELADO: 3,
	NOTA_GERADA: 4,
} as const;

export const DAV_STATUS_LABELS: Record<number, string> = {
	0: "Aberto",
	1: "Fechado",
	2: "Passou pelo caixa",
	3: "Cancelado",
	4: "Nota gerada",
};

export const DAV_TIPO_DOCUMENTO_LABELS: Record<number, string> = {
	1: "Pré-venda",
	2: "Orçamento",
	4: "Pedido",
};

export function pedidoJaFaturado(pedido: {
	idnotafiscal?: string | null;
	idnfce?: string | null;
}): boolean {
	return !!(pedido.idnotafiscal || pedido.idnfce);
}

export function pedidoPodeFaturarNfe(pedido: {
	idnotafiscal?: string | null;
	idnfce?: string | null;
	status?: number | null;
	idcliente?: string | null;
}): boolean {
	if (pedidoJaFaturado(pedido)) return false;
	if (pedido.status === DAV_STATUS.CANCELADO) return false;
	if (!pedido.idcliente) return false;
	return true;
}

/** NFC-e não exige cliente (consumidor não identificado). */
export function pedidoPodeEmitirNfce(pedido: {
	idnotafiscal?: string | null;
	idnfce?: string | null;
	status?: number | null;
}): boolean {
	if (pedidoJaFaturado(pedido)) return false;
	if (pedido.status === DAV_STATUS.CANCELADO) return false;
	return true;
}

export function pedidoEhOrigemPos(pedido: {
	extra1?: string | null;
}): boolean {
	return (pedido.extra1 ?? "").trim().toUpperCase() === "POS";
}
