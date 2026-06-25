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
	4: "NF-e gerada",
};

export const DAV_TIPO_DOCUMENTO_LABELS: Record<number, string> = {
	1: "Pré-venda",
	2: "Orçamento",
	4: "Pedido",
};

export function pedidoPodeFaturarNfe(pedido: {
	idnotafiscal?: string | null;
	status?: number | null;
	idcliente?: string | null;
}): boolean {
	if (pedido.idnotafiscal) return false;
	if (pedido.status === DAV_STATUS.CANCELADO) return false;
	if (!pedido.idcliente) return false;
	return true;
}
