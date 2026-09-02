import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	cancelarNfeVendaService,
	type ResultadoCancelamentoNfe,
} from "@/service/nfe-emissao/cancelar-nfe-venda.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

type CancelarNfceVendaPdvParametros = {
	idusuario: string;
	idempresa: string;
	idvenda: string;
	justificativa: string;
};

export async function cancelarNfceVendaPdvService({
	idusuario,
	idempresa,
	idvenda,
	justificativa,
}: CancelarNfceVendaPdvParametros): Promise<
	HttpResponse<ResultadoCancelamentoNfe>
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
			"NFC-e da venda não encontrada na retaguarda para cancelamento",
		);
	}

	const nota = await buscarNotaFiscalPorId(venda.idnotafiscalnfce);
	if (!nota || nota.modelo !== "65") {
		return httpBadRequest(
			"Somente NFC-e (modelo 65) podem ser canceladas por esta rota",
		);
	}

	return cancelarNfeVendaService({
		idusuario,
		idnotafiscal: venda.idnotafiscalnfce,
		justificativa,
		modeloEsperado: "65",
	});
}
