import type { HttpResponse } from "@/model/http-model";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories";
import {
	buscarDadosDashboard,
	buscarHistoricoFinanceiro,
} from "@/repositories/dashboard-repositories";
import { httpNaoAutorizado, httpOk } from "@/util/http-util";

type BuscarDadosDashboardParametros = {
	idusuario: string;
	idempresa?: string;
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
}: BuscarDadosDashboardParametros): Promise<
	HttpResponse<DashboardResposta>
> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return httpNaoAutorizado();
	}

	// Se idempresa foi fornecido, verificar se o usuário tem acesso
	const empresaId = idempresa || idempresas[0];

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

	if (!idempresas.includes(empresaId)) {
		return httpNaoAutorizado();
	}

	const dados = await buscarHistoricoFinanceiro({
		idempresa: empresaId,
		dias,
	});

	return httpOk<HistoricoFinanceiroResposta>(dados);
}

