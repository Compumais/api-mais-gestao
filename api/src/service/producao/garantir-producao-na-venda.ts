import type { HttpResponse } from "@/model/http-model.js";
import { ORIGEM_PRODUCAO } from "@/model/registro-producao-model.js";
import { buscarFichaProducaoAtivaPorProduto } from "@/repositories/ficha-producao-repositories.js";
import { buscarRegistroProducaoVendaAtivo } from "@/repositories/registro-producao-repositories.js";
import {
	executarProducaoService,
	type ResultadoProducao,
} from "@/service/producao/executar-producao.js";
import { httpOk } from "@/util/http-util.js";
import type { TipoEstoque } from "@/util/tipo-estoque.js";

export type GarantirProducaoNaVendaParametros = {
	idempresa: string;
	idproduto: string;
	quantidade: string;
	idoriginal: string;
	tipoestoque: TipoEstoque;
	idusuario: string;
};

export type ResultadoGarantirProducao = {
	executada: boolean;
	jaExistia: boolean;
	registro?: ResultadoProducao;
};

/**
 * Se o produto tiver ficha ativa com produção na venda, executa a produção
 * antes da baixa do acabado. Idempotente por (idoriginal, produto, tipoestoque).
 */
export async function garantirProducaoNaVendaService({
	idempresa,
	idproduto,
	quantidade,
	idoriginal,
	tipoestoque,
	idusuario,
}: GarantirProducaoNaVendaParametros): Promise<
	HttpResponse<ResultadoGarantirProducao>
> {
	const ficha = await buscarFichaProducaoAtivaPorProduto(idempresa, idproduto);
	if (!ficha || ficha.producaonavenda !== 1) {
		return httpOk({ executada: false, jaExistia: false });
	}

	const existente = await buscarRegistroProducaoVendaAtivo({
		idoriginal,
		idprodutoacabado: idproduto,
		tipoestoque,
	});

	if (existente) {
		return httpOk({
			executada: false,
			jaExistia: true,
			registro: {
				id: existente.id,
				idfichaproducao: existente.idfichaproducao,
				idprodutoacabado: existente.idprodutoacabado,
				origem: existente.origem,
				quantidadeproduzida: existente.quantidadeproduzida,
				custototal: existente.custototal ?? "0",
				custounitario: existente.custounitario ?? "0",
				tipoestoque: existente.tipoestoque,
				idoriginal: existente.idoriginal,
			},
		});
	}

	const resultado = await executarProducaoService({
		idficha: ficha.id,
		quantidade,
		idusuario,
		origem: ORIGEM_PRODUCAO.VENDA,
		tipoestoque,
		idoriginal,
		ignorarFlagMassa: true,
	});

	if (!resultado.success || !resultado.body) {
		return resultado as HttpResponse<ResultadoGarantirProducao>;
	}

	return httpOk({
		executada: true,
		jaExistia: false,
		registro: resultado.body,
	});
}
