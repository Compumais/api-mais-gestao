import {
	listarHistoricoRegraFiscal,
	type RegraFiscalHistorico,
} from "@/repositories/regra-fiscal-repositories.js";
import type { HttpResponse } from "@/model/http-model.js";
import { httpOk } from "@/util/http-util.js";

export async function listarHistoricoRegraFiscalService(
	id: string,
): Promise<HttpResponse<{ data: RegraFiscalHistorico[] }>> {
	const data = await listarHistoricoRegraFiscal(id);
	return httpOk({ data });
}
