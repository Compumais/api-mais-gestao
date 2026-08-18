import { buscarCupomNfce, buscarVendaPdvGourmet, pingApi } from "../api/client";
import {
	listarVendasComRemoto,
	obterNfcePorVenda,
	obterSessao,
} from "../db/repos";
import { aplicarEmissaoNfceNaVendaLocal } from "../fiscal/persistir-nfce-online";

export type NfceRetaguarda = {
	idnotafiscal: string;
	status: number | null;
	chave: string | null;
	serie: string | null;
	numero: string | null;
	protocolo: string | null;
};

let sincronizando = false;

export function statusNfceRetaguardaParaPdv(
	status: number | null | undefined,
): "autorizada" | "erro" | "inutilizada" | "cancelada" | "pendente" | null {
	switch (status) {
		case 100:
			return "autorizada";
		case 101:
		case 135:
			return "cancelada";
		case 102:
			return "inutilizada";
		case 110:
		case 301:
			return "erro";
		case 90:
			return "pendente";
		default:
			return null;
	}
}

export async function puxarNfceDaRetaguarda(limite = 40): Promise<number> {
	if (sincronizando) {
		return 0;
	}
	sincronizando = true;
	let atualizadas = 0;
	try {
		const online = await pingApi();
		if (!online) {
			return 0;
		}
		const sessao = await obterSessao();
		if (!sessao.token || !sessao.idempresa) {
			return 0;
		}

		const vendas = await listarVendasComRemoto(limite);
		for (const venda of vendas) {
			if (!venda.idremoto) continue;
			try {
				const remota = await buscarVendaPdvGourmet(venda.idremoto);
				if (!remota.nfce && !remota.idnotafiscalnfce) {
					continue;
				}
				const nfce: NfceRetaguarda = remota.nfce ?? {
					idnotafiscal: remota.idnotafiscalnfce ?? "",
					status: null,
					chave: null,
					serie: null,
					numero: null,
					protocolo: null,
				};
				if (!nfce.idnotafiscal) continue;
				await aplicarNfceRetaguardaNaVendaLocal(venda.id, nfce);
				atualizadas += 1;
			} catch {
				// uma venda não pode interromper o lote
			}
		}
	} finally {
		sincronizando = false;
	}
	return atualizadas;
}

export async function aplicarNfceRetaguardaNaVendaLocal(
	vendaId: string,
	nfce: NfceRetaguarda,
): Promise<void> {
	const statusPdv = statusNfceRetaguardaParaPdv(nfce.status);
	if (!statusPdv) {
		return;
	}

	let xml: string | undefined;
	if (statusPdv === "autorizada") {
		const local = await obterNfcePorVenda(vendaId);
		if (!local?.xml?.trim()) {
			try {
				const cupom = await buscarCupomNfce(nfce.idnotafiscal);
				xml = cupom.xml;
			} catch {
				xml = undefined;
			}
		}
	}

	const emitida = statusPdv === "autorizada";
	await aplicarEmissaoNfceNaVendaLocal(vendaId, {
		emitida,
		idnotafiscal: nfce.idnotafiscal,
		chave: nfce.chave ?? undefined,
		protocolo: nfce.protocolo ?? undefined,
		xml,
		serie: nfce.serie ?? undefined,
		numero: nfce.numero != null ? Number(nfce.numero) : undefined,
		statusLocal: statusPdv,
	});
}
