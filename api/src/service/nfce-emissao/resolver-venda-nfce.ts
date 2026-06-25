import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import {
	buscarVendaPdvGourmetPorId,
	buscarVendaPdvGourmetPorNotaFiscalNfce,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";

function extrairIdVendaDadosImportacao(dados: unknown): string | null {
	if (!dados || typeof dados !== "object") return null;
	const idvenda = (dados as { idvenda?: unknown }).idvenda;
	return typeof idvenda === "string" ? idvenda : null;
}

export async function resolverVendaPorNotaFiscalNfce(
	idnotafiscal: string,
	idempresa: string,
): Promise<{ nota: NotaFiscal; venda: VendaPdvGourmet } | null> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);
	if (!nota || nota.idempresa !== idempresa || nota.modelo !== "65") {
		return null;
	}

	let venda = await buscarVendaPdvGourmetPorNotaFiscalNfce(idnotafiscal);
	if (!venda) {
		const idvenda = extrairIdVendaDadosImportacao(nota.dadosimportacao);
		if (idvenda) {
			venda = await buscarVendaPdvGourmetPorId(idvenda);
		}
	}

	if (!venda || venda.idempresa !== idempresa) {
		return null;
	}

	return { nota, venda };
}
