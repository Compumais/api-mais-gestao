import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarDadosDashboard,
	buscarHistoricoFinanceiro,
	buscarTopDespesasPorCategoria,
	buscarTopReceitasPorCategoria,
	type TopPorCategoriaResposta,
} from "@/repositories/dashboard-repositories.js";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories.js";
import { httpNaoAutorizado, httpOk } from "@/util/http-util.js";

type BuscarDadosDashboardParametros = {
	idusuario: string;
	idempresa: string;
};

type DashboardResposta = {
	totalContasPagar: string;
	totalContasReceber: string;
	saldoBancario: string;
	saldoCaixa: string;
	quantidadeUsuarios: number;
};

export async function buscarDadosDashboardService({
	idusuario,
	idempresa,
}: BuscarDadosDashboardParametros): Promise<HttpResponse<DashboardResposta>> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return httpNaoAutorizado();
	}

	// Se idempresa foi fornecido, verificar se o usuário tem acesso
	const empresaId = idempresa || idempresas[0];

	if (!empresaId) {
		return httpNaoAutorizado();
	}

	if (!idempresas.includes(empresaId)) {
		return httpNaoAutorizado();
	}

	const dados = await buscarDadosDashboard({ idempresa: empresaId });

	return httpOk<DashboardResposta>(dados);
}

type BuscarHistoricoFinanceiroParametros = {
	idusuario: string;
	idempresa?: string;
	dias: number;
};

type HistoricoFinanceiroResposta = {
	date: string;
	contasPagar: number;
	contasReceber: number;
}[];

export async function buscarHistoricoFinanceiroService({
	idusuario,
	idempresa,
	dias,
}: BuscarHistoricoFinanceiroParametros): Promise<
	HttpResponse<HistoricoFinanceiroResposta>
> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return httpNaoAutorizado();
	}

	// Se idempresa foi fornecido, verificar se o usuário tem acesso
	const empresaId = idempresa || idempresas[0];

	if (!empresaId) {
		return httpNaoAutorizado();
	}

	if (!idempresas.includes(empresaId)) {
		return httpNaoAutorizado();
	}

	const dados = await buscarHistoricoFinanceiro({
		idempresa: empresaId,
		dias,
	});

	return httpOk<HistoricoFinanceiroResposta>(dados);
}

type BuscarTopDespesasPorCategoriaParametros = {
	idusuario: string;
	idempresa?: string;
	dias?: number;
};

export async function buscarTopDespesasPorCategoriaService({
	idusuario,
	idempresa,
	dias = 90,
}: BuscarTopDespesasPorCategoriaParametros): Promise<
	HttpResponse<TopPorCategoriaResposta>
> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return httpNaoAutorizado();
	}

	const empresaId = idempresa || idempresas[0];

	if (!empresaId) {
		return httpNaoAutorizado();
	}

	if (!idempresas.includes(empresaId)) {
		return httpNaoAutorizado();
	}

	const dados = await buscarTopDespesasPorCategoria({
		idempresa: empresaId,
		dias,
	});

	return httpOk<TopPorCategoriaResposta>(dados);
}

type BuscarTopReceitasPorCategoriaParametros = {
	idusuario: string;
	idempresa?: string;
	dias?: number;
};

export async function buscarTopReceitasPorCategoriaService({
	idusuario,
	idempresa,
	dias = 90,
}: BuscarTopReceitasPorCategoriaParametros): Promise<
	HttpResponse<TopPorCategoriaResposta>
> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return httpNaoAutorizado();
	}

	const empresaId = idempresa || idempresas[0];

	if (!empresaId) {
		return httpNaoAutorizado();
	}

	if (!idempresas.includes(empresaId)) {
		return httpNaoAutorizado();
	}

	const dados = await buscarTopReceitasPorCategoria({
		idempresa: empresaId,
		dias,
	});

	return httpOk<TopPorCategoriaResposta>(dados);
}
