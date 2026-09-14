import { nomeVisivelPessoa } from "@/lib/nome-visivel";
import type { VendaPdvGourmet } from "@/services/venda-pdv-gourmet.service";
import type { VendaPdvItem } from "@/services/venda-pdv-item.service";

export function tipoVenda(venda: VendaPdvGourmet) {
	if (venda.idcontamesa) return "Mesa";
	if (venda.vendalocal === 3) return "PDV";
	if (venda.vendalocal === 2) return "POS";
	return "Balcão";
}

export function calcularTotal(itens: VendaPdvItem[]): number {
	return itens.reduce(
		(acc, item) => acc + Number.parseFloat(item.precototal ?? "0"),
		0,
	);
}

export function filtrosAtivos(filtros: {
	dataInicio: string;
	dataFim: string;
	numeropdv: string;
}): boolean {
	return !!(filtros.dataInicio || filtros.dataFim || filtros.numeropdv);
}

export function nomeOperador(
	venda: VendaPdvGourmet,
	usuariosPorId: Record<string, string>,
): string {
	return (
		nomeVisivelPessoa(venda.operadorNome) ??
		nomeVisivelPessoa(usuariosPorId[venda.usuarioquefechouvenda]) ??
		"—"
	);
}

export function documentoVenda(venda: VendaPdvGourmet): "fiscal" | "gerencial" {
	if (venda.documento) return venda.documento;
	if (venda.idnotafiscalnfce || venda.deveemitirnfce) return "fiscal";
	return "gerencial";
}

export function rotuloFiscal(venda: VendaPdvGourmet): "Fiscal" | "Não fiscal" {
	return documentoVenda(venda) === "fiscal" ? "Fiscal" : "Não fiscal";
}

function valorPago(valor?: string | null): boolean {
	return Number.parseFloat(String(valor ?? "0").replace(",", ".")) > 0;
}

export function meiosPagamentoVenda(venda: VendaPdvGourmet): string[] {
	if (venda.meiosPagamento?.length) return venda.meiosPagamento;
	const meios: string[] = [];
	if (valorPago(venda.valordinheiro)) meios.push("Dinheiro");
	if (valorPago(venda.valorpix)) meios.push("PIX");
	if (valorPago(venda.valorcartaocredito)) meios.push("Cartão crédito");
	if (valorPago(venda.valorcartaodebito)) meios.push("Cartão débito");
	if (valorPago(venda.valorcartao)) meios.push("Cartão");
	if (valorPago(venda.valorprepago)) meios.push("Pré-pago");
	return meios;
}

export function idNfceVenda(venda: VendaPdvGourmet): string | null {
	return venda.nfce?.idnotafiscal ?? venda.idnotafiscalnfce ?? null;
}

export function rotuloNfce(venda: VendaPdvGourmet): string | null {
	const numero = venda.nfce?.numero?.trim();
	if (!numero) return null;
	const serie = venda.nfce?.serie?.trim();
	return serie ? `${numero}/${serie}` : numero;
}
