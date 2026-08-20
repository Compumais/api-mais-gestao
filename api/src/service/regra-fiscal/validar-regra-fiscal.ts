import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarRegraFiscal,
	buscarRegraFiscalPorId,
	fontesRegraFiscal,
	type RegraFiscal,
} from "@/repositories/regra-fiscal-repositories.js";
import { httpBadRequest, httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function validarRegraFiscalService(params: {
	id: string;
	idusuario: string;
}): Promise<HttpResponse<RegraFiscal>> {
	const atual = await buscarRegraFiscalPorId(params.id);
	if (!atual) return httpNaoEncontrado();

	const fontes = fontesRegraFiscal(atual.fontes);
	const temFonte = fontes.some((fonte) => fonte.url || fonte.orgao);
	if (!temFonte) {
		return httpBadRequest(
			"Informe ao menos uma fonte oficial (órgão ou URL) antes de validar a regra",
			{ code: "FONTE_OBRIGATORIA" },
		);
	}

	const registro = await atualizarRegraFiscal(params.id, {
		status: "validado",
		validadoem: new Date().toISOString(),
		validadopor: params.idusuario,
	});

	if (!registro) return httpNaoEncontrado();
	return httpOk(registro);
}
