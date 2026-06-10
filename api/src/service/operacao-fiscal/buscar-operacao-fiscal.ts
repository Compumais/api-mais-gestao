import type { HttpResponse } from "@/model/http-model.js";
import type { OperacaoFiscal } from "@/model/operacao-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarOperacaoFiscalPorId } from "@/repositories/operacao-fiscal-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarOperacaoFiscalParametros = {
	operacaoFiscalId: string;
	idusuario: string;
};

export async function buscarOperacaoFiscalService({
	operacaoFiscalId,
	idusuario,
}: BuscarOperacaoFiscalParametros): Promise<
	HttpResponse<OperacaoFiscal | null>
> {
	const registro = await buscarOperacaoFiscalPorId(operacaoFiscalId);

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

	return httpOk<OperacaoFiscal>(registro);
}
