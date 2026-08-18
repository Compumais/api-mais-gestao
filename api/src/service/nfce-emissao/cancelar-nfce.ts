import type { HttpResponse } from "@/model/http-model.js";
import {
	cancelarNfeVendaService,
	type ResultadoCancelamentoNfe,
} from "@/service/nfe-emissao/cancelar-nfe-venda.js";

type CancelarNfceParametros = {
	idusuario: string;
	idnotafiscal: string;
	justificativa: string;
};

export async function cancelarNfceService({
	idusuario,
	idnotafiscal,
	justificativa,
}: CancelarNfceParametros): Promise<HttpResponse<ResultadoCancelamentoNfe>> {
	return cancelarNfeVendaService({
		idusuario,
		idnotafiscal,
		justificativa,
		modeloEsperado: "65",
	});
}
