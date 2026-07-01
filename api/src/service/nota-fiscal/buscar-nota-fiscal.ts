import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarNotaFiscalParametros = {
	notaFiscalId: string;
	idusuario: string;
};

type BuscarNotaFiscalResposta = {
	notaFiscal: NotaFiscal;
	itens: NotaFiscalItem[];
};

export async function buscarNotaFiscalService({
	notaFiscalId,
	idusuario,
}: BuscarNotaFiscalParametros): Promise<
	HttpResponse<BuscarNotaFiscalResposta>
> {
	const registro = await buscarNotaFiscalPorId(notaFiscalId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const itens = await listarItensPorNotaFiscal(notaFiscalId);

	return httpOk<BuscarNotaFiscalResposta>({
		notaFiscal: registro,
		itens,
	});
}
