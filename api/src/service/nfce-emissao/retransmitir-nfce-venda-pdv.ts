import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	emitirNfceVendaPdvService,
	type ResultadoEmissaoNfcePdv,
} from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

type RetransmitirNfceVendaPdvParametros = {
	idusuario: string;
	idempresa: string;
	idvenda: string;
};

/**
 * Retransmite NFC-e de uma venda PDV já persistida na retaguarda,
 * sem nova baixa de estoque. Cobre rejeição, pendência e primeira
 * emissão que falhou na validação (ainda sem nota).
 */
export async function retransmitirNfceVendaPdvService({
	idusuario,
	idempresa,
	idvenda,
}: RetransmitirNfceVendaPdvParametros): Promise<
	HttpResponse<ResultadoEmissaoNfcePdv>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const venda = await buscarVendaPdvGourmetPorId(idvenda);
	if (!venda || venda.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (venda.idnotafiscalnfce) {
		const nota = await buscarNotaFiscalPorId(venda.idnotafiscalnfce);
		if (nota?.status === NFE_STATUS.AUTORIZADA) {
			return httpBadRequest("NFC-e já autorizada não pode ser retransmitida");
		}
		if (
			nota &&
			nota.status !== NFE_STATUS.PENDENTE &&
			nota.status !== NFE_STATUS.REJEITADA &&
			nota.status !== NFE_STATUS.DENEGADA
		) {
			return httpBadRequest(
				"Somente NFC-e pendentes, rejeitadas ou denegadas podem ser retransmitidas",
			);
		}
	}

	return emitirNfceVendaPdvService({
		idusuario,
		idempresa,
		idvenda: venda.id,
		pagamentos: {
			valordinheiro: venda.valordinheiro,
			valorcartao: venda.valorcartao,
			valorcartaocredito: venda.valorcartaocredito,
			valorcartaodebito: venda.valorcartaodebito,
			valorpix: venda.valorpix,
			valorprepago: venda.valorprepago,
			valortroco: venda.valortroco,
			valortotal: venda.valortotal,
		},
	});
}
