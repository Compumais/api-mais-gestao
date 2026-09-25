import {
	NFE_STATUS,
	NFE_STATUS_LABELS,
	statusEhAutorizada,
	statusEhCancelada,
} from "@/constants/nfe-status";
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

export function rotuloStatusNfce(venda: VendaPdvGourmet): string {
	if (documentoVenda(venda) !== "fiscal") return "—";
	const status = venda.nfce?.status;
	if (status == null && !idNfceVenda(venda)) return "Sem NFC-e";
	if (status == null) return "Pendente";
	return NFE_STATUS_LABELS[status] ?? `Status ${status}`;
}

/**
 * Venda sem NFC-e autorizada: cancelável a qualquer tempo (sem prazo SEFAZ).
 * Inclui não fiscal e tentativas fiscais rejeitadas/inutilizadas/pendentes.
 */
export function podeCancelarVendaNaoFiscal(venda: VendaPdvGourmet): boolean {
	if (statusEhAutorizada(venda.nfce?.status)) return false;
	if (statusEhCancelada(venda.nfce?.status)) return false;

	if (documentoVenda(venda) === "gerencial") return true;

	const status = venda.nfce?.status;
	if (status == null) return true;
	return (
		status === NFE_STATUS.PENDENTE ||
		status === NFE_STATUS.REJEITADA ||
		status === NFE_STATUS.INUTILIZADA ||
		status === NFE_STATUS.DENEGADA ||
		status === NFE_STATUS.RASCUNHO
	);
}

export type FiltrosColunaVendasPdvState = {
	numeropdv: string;
	datacriacao: string;
	origem: string;
	operador: string;
	pagamento: string;
	fiscal: string;
	nfce: string;
	valortotal: string;
};

export const filtrosColunaVendasPdvVazios: FiltrosColunaVendasPdvState = {
	numeropdv: "",
	datacriacao: "",
	origem: "",
	operador: "",
	pagamento: "",
	fiscal: "",
	nfce: "",
	valortotal: "",
};

export function filtrosColunaVendasPdvAtivos(
	filtros: FiltrosColunaVendasPdvState,
): boolean {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

function diaBrasilia(iso: string | null | undefined): string {
	if (!iso) return "";
	try {
		return new Intl.DateTimeFormat("en-CA", {
			timeZone: "America/Sao_Paulo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date(iso));
	} catch {
		return iso.slice(0, 10);
	}
}

export function filtrarVendasPdvColuna(
	vendas: VendaPdvGourmet[],
	filtros: FiltrosColunaVendasPdvState,
	usuariosPorId: Record<string, string>,
): VendaPdvGourmet[] {
	return vendas.filter((venda) => {
		if (filtros.numeropdv.trim()) {
			if (!String(venda.numeropdv).includes(filtros.numeropdv.trim())) {
				return false;
			}
		}
		if (filtros.datacriacao.trim()) {
			if (diaBrasilia(venda.datacriacao) !== filtros.datacriacao.trim()) {
				return false;
			}
		}
		if (filtros.origem.trim()) {
			if (tipoVenda(venda) !== filtros.origem.trim()) return false;
		}
		if (filtros.operador.trim()) {
			const termo = filtros.operador.trim().toLowerCase();
			const nome = nomeOperador(venda, usuariosPorId).toLowerCase();
			if (!nome.includes(termo)) return false;
		}
		if (filtros.pagamento.trim()) {
			const meios = meiosPagamentoVenda(venda);
			if (!meios.includes(filtros.pagamento.trim())) return false;
		}
		if (filtros.fiscal.trim()) {
			if (documentoVenda(venda) !== filtros.fiscal.trim()) return false;
		}
		if (filtros.nfce.trim()) {
			const rotulo = rotuloStatusNfce(venda);
			const numero = rotuloNfce(venda) ?? "";
			const termo = filtros.nfce.trim().toLowerCase();
			if (
				rotulo.toLowerCase() !== termo &&
				!numero.toLowerCase().includes(termo) &&
				String(venda.nfce?.status ?? "") !== termo
			) {
				return false;
			}
		}
		if (filtros.valortotal.trim()) {
			const termo = filtros.valortotal.trim().replace(",", ".");
			const total = String(venda.valortotal ?? "").replace(",", ".");
			if (!total.includes(termo)) return false;
		}
		return true;
	});
}

export function ordenarVendasPdvColuna(
	vendas: VendaPdvGourmet[],
	ordenarPor: string | null,
	ordem: "asc" | "desc" | null,
	usuariosPorId: Record<string, string>,
): VendaPdvGourmet[] {
	if (!ordenarPor || !ordem) return vendas;

	const fator = ordem === "asc" ? 1 : -1;
	const lista = [...vendas];

	lista.sort((a, b) => {
		let cmp = 0;
		switch (ordenarPor) {
			case "numeropdv":
				cmp = a.numeropdv - b.numeropdv;
				break;
			case "datacriacao":
				cmp = String(a.datacriacao ?? "").localeCompare(
					String(b.datacriacao ?? ""),
				);
				break;
			case "origem":
				cmp = tipoVenda(a).localeCompare(tipoVenda(b));
				break;
			case "operador":
				cmp = nomeOperador(a, usuariosPorId).localeCompare(
					nomeOperador(b, usuariosPorId),
				);
				break;
			case "pagamento":
				cmp = meiosPagamentoVenda(a)
					.join(",")
					.localeCompare(meiosPagamentoVenda(b).join(","));
				break;
			case "fiscal":
				cmp = documentoVenda(a).localeCompare(documentoVenda(b));
				break;
			case "nfce":
				cmp = rotuloStatusNfce(a).localeCompare(rotuloStatusNfce(b));
				break;
			case "valortotal":
				cmp =
					Number.parseFloat(String(a.valortotal ?? "0").replace(",", ".")) -
					Number.parseFloat(String(b.valortotal ?? "0").replace(",", "."));
				break;
			default:
				cmp = 0;
		}
		return cmp * fator;
	});

	return lista;
}
