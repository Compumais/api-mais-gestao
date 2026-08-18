import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import {
	inutilizarNfeVendaService,
	type ResultadoInutilizacaoNfe,
} from "@/service/nfe-emissao/inutilizar-nfe-venda.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";
import {
	MENSAGEM_NFE_NO_FLUXO_NFCE,
	notaEhModeloNfce65,
} from "@/util/modelo-documento-fiscal-fluxo.js";

type InutilizarNfcePorNotaParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal: string;
	justificativa: string;
};

export async function inutilizarNfcePorNotaService({
	idusuario,
	idempresa,
	idnotafiscal,
	justificativa,
}: InutilizarNfcePorNotaParametros): Promise<
	HttpResponse<ResultadoInutilizacaoNfe>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalPorId(idnotafiscal);
	if (!nota || nota.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (!notaEhModeloNfce65(nota.modelo)) {
		return httpBadRequest(MENSAGEM_NFE_NO_FLUXO_NFCE);
	}

	return inutilizarNfeVendaService({
		idusuario,
		idnotafiscal,
		justificativa,
		permitirNfce: true,
	});
}
