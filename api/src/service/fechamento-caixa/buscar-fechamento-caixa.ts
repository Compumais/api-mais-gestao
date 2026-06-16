import type { FechamentoCaixa } from "@/model/fechamento-caixa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarFechamentoCaixaPorId } from "@/repositories/fechamento-caixa-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarFechamentoCaixaParametros = {
	fechamentoCaixaId: number;
	idusuario: string;
};

export async function buscarFechamentoCaixaService({
	fechamentoCaixaId,
	idusuario,
}: BuscarFechamentoCaixaParametros): Promise<
	HttpResponse<FechamentoCaixa | null>
> {
	const registro = await buscarFechamentoCaixaPorId(fechamentoCaixaId);

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

	return httpOk<FechamentoCaixa>(registro);
}
