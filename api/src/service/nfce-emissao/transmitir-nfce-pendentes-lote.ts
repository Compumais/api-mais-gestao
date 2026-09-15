import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { listarNfcePorEmpresa } from "@/repositories/nota-fiscal-repositories.js";
import { reemitirNfceService } from "@/service/nfce-emissao/reemitir-nfce.js";
import { resolverAmbienteSefaz } from "@/util/ambiente-sefaz.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

const LIMITE_LOTE_PADRAO = 50;

type TransmitirNfcePendentesLoteParametros = {
	idusuario: string;
	idempresa: string;
	/** Máximo de NFC-e a processar neste lote (1–100). */
	limite?: number;
};

export type ItemTransmitirNfcePendentesLote = {
	idnotafiscal: string;
	idvenda: string | null;
	numeronotafiscal: string | null;
	serie: string | null;
	sucesso: boolean;
	mensagem: string;
};

export type TransmitirNfcePendentesLoteResultado = {
	total: number;
	autorizadas: number;
	falhas: number;
	itens: ItemTransmitirNfcePendentesLote[];
};

/**
 * Retransmite em lote todas as NFC-e com status pendente (90) da empresa,
 * reutilizando a reemissão individual (SEFAZ via gateway).
 */
export async function transmitirNfcePendentesLoteService({
	idusuario,
	idempresa,
	limite = LIMITE_LOTE_PADRAO,
}: TransmitirNfcePendentesLoteParametros): Promise<
	HttpResponse<TransmitirNfcePendentesLoteResultado>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const limiteEfetivo = Math.min(100, Math.max(1, Math.floor(limite)));

	const nfceConfig = await buscarNfceConfiguracaoPorEmpresa(idempresa);
	const tipoambientenfe = resolverAmbienteSefaz(nfceConfig?.ambiente);

	const listagem = await listarNfcePorEmpresa({
		idempresa,
		status: NFE_STATUS.PENDENTE,
		tipoambientenfe,
		ordenarPor: "datainclusao",
		ordem: "asc",
		page: 1,
		limit: limiteEfetivo,
	});

	const itens: ItemTransmitirNfcePendentesLote[] = [];
	let autorizadas = 0;
	let falhas = 0;

	for (const nota of listagem.notas) {
		const resultado = await reemitirNfceService({
			idusuario,
			idempresa,
			idnotafiscal: nota.idnotafiscal,
		});

		if (!resultado.success) {
			falhas += 1;
			itens.push({
				idnotafiscal: nota.idnotafiscal,
				idvenda: nota.idvenda,
				numeronotafiscal: nota.numeronotafiscal,
				serie: nota.serie,
				sucesso: false,
				mensagem: resultado.error ?? "Falha ao retransmitir NFC-e",
			});
			continue;
		}

		const body = resultado.body;
		const emitida = Boolean(body?.emitida);
		if (emitida) {
			autorizadas += 1;
			itens.push({
				idnotafiscal: nota.idnotafiscal,
				idvenda: nota.idvenda,
				numeronotafiscal: nota.numeronotafiscal,
				serie: nota.serie,
				sucesso: true,
				mensagem: "NFC-e autorizada",
			});
		} else {
			falhas += 1;
			const mensagem =
				body?.xMotivo ??
				body?.erro ??
				body?.pendencias?.map((p) => p.mensagem).join("; ") ??
				"NFC-e não autorizada";
			itens.push({
				idnotafiscal: nota.idnotafiscal,
				idvenda: nota.idvenda,
				numeronotafiscal: nota.numeronotafiscal,
				serie: nota.serie,
				sucesso: false,
				mensagem,
			});
		}
	}

	return httpOk({
		total: itens.length,
		autorizadas,
		falhas,
		itens,
	});
}
