import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	inutilizarNfeVendaService,
	type ResultadoInutilizacaoNfe,
} from "@/service/nfe-emissao/inutilizar-nfe-venda.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

type InutilizarNfceVendaPdvParametros = {
	idusuario: string;
	idempresa: string;
	idvenda: string;
	justificativa: string;
};

export async function inutilizarNfceVendaPdvService({
	idusuario,
	idempresa,
	idvenda,
	justificativa,
}: InutilizarNfceVendaPdvParametros): Promise<
	HttpResponse<ResultadoInutilizacaoNfe>
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

	if (!venda.idnotafiscalnfce) {
		return httpBadRequest(
			"NFC-e da venda não encontrada na retaguarda para inutilização",
		);
	}

	const nota = await buscarNotaFiscalPorId(venda.idnotafiscalnfce);
	if (!nota || nota.modelo !== "65") {
		return httpBadRequest(
			"Somente NFC-e (modelo 65) podem ser inutilizadas por esta rota",
		);
	}
	if (!nota.serie || !nota.numeronotafiscal) {
		return httpBadRequest(
			"Esta NFC-e ainda não possui numeração fiscal. Corrija os itens na retaguarda e retransmita; não há número a inutilizar.",
		);
	}

	return inutilizarNfeVendaService({
		idusuario,
		idnotafiscal: venda.idnotafiscalnfce,
		justificativa,
		permitirNfce: true,
	});
}
