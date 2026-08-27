import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarRegistroProducaoPorId,
	listarItensRegistroProducao,
	listarRegistrosProducao,
	type OrdenarProducoesCampo,
} from "@/repositories/registro-producao-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type ListarProducoesParametros = {
	idusuario: string;
	idempresa: string;
	origem?: number | undefined;
	idprodutoacabado?: string | undefined;
	nome?: string | undefined;
	codigo?: string | undefined;
	datahora?: string | undefined;
	ordenarPor?: OrdenarProducoesCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarProducoesService({
	idusuario,
	idempresa,
	origem,
	idprodutoacabado,
	nome,
	codigo,
	datahora,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarProducoesParametros): Promise<HttpResponse<unknown>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { registros, total } = await listarRegistrosProducao({
		idempresa,
		origem,
		idprodutoacabado,
		nome,
		codigo,
		datahora,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	return httpOk({
		data: registros,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	});
}

type BuscarProducaoParametros = {
	id: string;
	idusuario: string;
};

export async function buscarProducaoService({
	id,
	idusuario,
}: BuscarProducaoParametros): Promise<HttpResponse<unknown>> {
	const registro = await buscarRegistroProducaoPorId(id);
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

	const [itens, produto] = await Promise.all([
		listarItensRegistroProducao(id),
		buscarProdutoPorId(registro.idprodutoacabado),
	]);

	return httpOk({
		...registro,
		itens,
		nomeprodutoacabado: produto?.nome ?? null,
		codigoprodutoacabado: produto?.codigo ?? null,
	});
}
