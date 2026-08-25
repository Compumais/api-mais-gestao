export const STATUS_COTACAO_COMPRA: Record<
	string,
	{ label: string; variant: "outline" | "secondary" | "default" | "destructive" }
> = {
	R: { label: "Rascunho", variant: "outline" },
	A: { label: "Aberta", variant: "default" },
	E: { label: "Encerrada", variant: "secondary" },
	C: { label: "Cancelada", variant: "destructive" },
};

export const STATUS_PEDIDO_COMPRA: Record<
	string,
	{ label: string; variant: "outline" | "secondary" | "default" | "destructive" }
> = {
	A: { label: "Aberto", variant: "default" },
	C: { label: "Cancelado", variant: "destructive" },
};

export function formatarMoeda(valor: string | number) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number(valor));
}

export function formatarQuantidade(valor: string | number) {
	const numero = Number(valor);
	if (!Number.isFinite(numero)) return String(valor);
	return new Intl.NumberFormat("pt-BR", {
		maximumFractionDigits: 4,
	}).format(numero);
}

export function labelProdutoCotacao(item: {
	codigoproduto?: number | null;
	nomeproduto?: string | null;
	descricaoproduto?: string | null;
	descricao?: string | null;
	idproduto?: string | null;
}) {
	const nome =
		item.descricao || item.nomeproduto || item.descricaoproduto || "";
	if (!nome) return "Produto não cadastrado";
	return item.codigoproduto != null ? `${item.codigoproduto} — ${nome}` : nome;
}
