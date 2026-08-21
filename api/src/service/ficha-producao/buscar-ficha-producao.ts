import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarFichaProducaoPorId,
	listarItensFichaProducaoEnriquecidos,
} from "@/repositories/ficha-producao-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarFichaProducaoParametros = {
	id: string;
	idusuario: string;
};

export async function buscarFichaProducaoService({
	id,
	idusuario,
}: BuscarFichaProducaoParametros): Promise<HttpResponse<unknown>> {
	const ficha = await buscarFichaProducaoPorId(id);
	if (!ficha) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		ficha.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const [itens, produtoAcabado] = await Promise.all([
		listarItensFichaProducaoEnriquecidos(id),
		buscarProdutoPorId(ficha.idprodutoacabado),
	]);

	return httpOk({
		...ficha,
		itens,
		nomeprodutoacabado: produtoAcabado?.nome ?? null,
		codigoprodutoacabado: produtoAcabado?.codigo ?? null,
		unidademedidaacabado: produtoAcabado?.unidademedida ?? null,
	});
}
