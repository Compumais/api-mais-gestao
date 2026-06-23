import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarDadosVendas,
	buscarHistoricoVendas,
	buscarTopProdutos,
	buscarUltimosFechamentos,
	type DadosVendasResumo,
	type FechamentoCaixaItem,
	type HistoricoVendasItem,
	type TopProdutoItem,
} from "@/repositories/dashboard-repositories.js";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories.js";
import { httpNaoAutorizado, httpOk } from "@/util/http-util.js";

type ParametrosBase = {
	idusuario: string;
	idempresa?: string;
};

async function resolverEmpresaId(
	idusuario: string,
	idempresa?: string,
): Promise<string | null> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return null;
	}

	const empresaId = idempresa || idempresas[0];

	if (!empresaId || !idempresas.includes(empresaId)) {
		return null;
	}

	return empresaId;
}

export async function buscarDadosVendasService({
	idusuario,
	idempresa,
	dias = 90,
}: ParametrosBase & { dias?: number }): Promise<HttpResponse<DadosVendasResumo>> {
	const empresaId = await resolverEmpresaId(idusuario, idempresa);

	if (!empresaId) {
		return httpNaoAutorizado();
	}

	const dados = await buscarDadosVendas({ idempresa: empresaId, dias });

	return httpOk(dados);
}

export async function buscarHistoricoVendasService({
	idusuario,
	idempresa,
	dias = 90,
}: ParametrosBase & { dias?: number }): Promise<
	HttpResponse<HistoricoVendasItem[]>
> {
	const empresaId = await resolverEmpresaId(idusuario, idempresa);

	if (!empresaId) {
		return httpNaoAutorizado();
	}

	const dados = await buscarHistoricoVendas({ idempresa: empresaId, dias });

	return httpOk(dados);
}

export async function buscarTopProdutosService({
	idusuario,
	idempresa,
	dias = 90,
}: ParametrosBase & { dias?: number }): Promise<HttpResponse<TopProdutoItem[]>> {
	const empresaId = await resolverEmpresaId(idusuario, idempresa);

	if (!empresaId) {
		return httpNaoAutorizado();
	}

	const dados = await buscarTopProdutos({ idempresa: empresaId, dias });

	return httpOk(dados);
}

export async function buscarUltimosFechamentosService({
	idusuario,
	idempresa,
	limit = 5,
}: ParametrosBase & { limit?: number }): Promise<
	HttpResponse<FechamentoCaixaItem[]>
> {
	const empresaId = await resolverEmpresaId(idusuario, idempresa);

	if (!empresaId) {
		return httpNaoAutorizado();
	}

	const dados = await buscarUltimosFechamentos({
		idempresa: empresaId,
		limit,
	});

	return httpOk(dados);
}
