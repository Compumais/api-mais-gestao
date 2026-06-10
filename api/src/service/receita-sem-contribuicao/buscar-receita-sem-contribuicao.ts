import type { ReceitaSemContribuicao } from "@/model/receita-sem-contribuicao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarReceitaSemContribuicaoPorId } from "@/repositories/receita-sem-contribuicao-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarReceitaSemContribuicaoParametros = {
	receitaSemContribuicaoId: string;
	idusuario: string;
};

export async function buscarReceitaSemContribuicaoService({
	receitaSemContribuicaoId,
	idusuario,
}: BuscarReceitaSemContribuicaoParametros): Promise<
	HttpResponse<ReceitaSemContribuicao | null>
> {
	const registro = await buscarReceitaSemContribuicaoPorId(
		receitaSemContribuicaoId,
	);

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

	return httpOk<ReceitaSemContribuicao>(registro);
}
