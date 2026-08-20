import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarRegraFiscalPorId,
	type RegraFiscal,
} from "@/repositories/regra-fiscal-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function buscarRegraFiscalService(
	id: string,
): Promise<HttpResponse<RegraFiscal>> {
	const registro = await buscarRegraFiscalPorId(id);
	if (!registro) return httpNaoEncontrado();
	return httpOk(registro);
}
