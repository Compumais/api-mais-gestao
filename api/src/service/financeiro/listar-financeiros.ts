import type { Financeiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories.js";
import {
	listarFinanceiro,
	type OrdenarFinanceirosCampo,
} from "@/repositories/financeiro-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarFinanceirosParametros = {
	idusuario: string;
	idempresa?: string | null | undefined;
	saldo?: string | null | undefined;
	q?: string | null | undefined;
	emissao?: string | null | undefined;
	documento?: string | null | undefined;
	tipodocumentodescricao?: string | null | undefined;
	emitente?: string | null | undefined;
	planocontasnome?: string | null | undefined;
	nossonumero?: string | null | undefined;
	historico?: string | null | undefined;
	emissaoInicio?: string | null | undefined;
	emissaoFim?: string | null | undefined;
	vencimentoInicio?: string | null | undefined;
	vencimentoFim?: string | null | undefined;
	vencimentooriginalInicio?: string | null | undefined;
	vencimentooriginalFim?: string | null | undefined;
	pagamentoInicio?: string | null | undefined;
	pagamentoFim?: string | null | undefined;
	baixaInicio?: string | null | undefined;
	baixaFim?: string | null | undefined;
	datareferenciaInicio?: string | null | undefined;
	datareferenciaFim?: string | null | undefined;
	entradaInicio?: string | null | undefined;
	entradaFim?: string | null | undefined;
	status?: string | null | undefined;
	tipo?: "P" | "R" | null | undefined;
	identidade?: string | null | undefined;
	idtipocobranca?: string | null | undefined;
	remessagerada?: number | null | undefined;
	permiteBoleto?: boolean | null | undefined;
	ordenarPor?: OrdenarFinanceirosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type FinanceiroListagem = Financeiro & {
	tipodocumentodescricao?: string | null;
	tipocobrancadescricao?: string | null;
	entidadenome?: string | null;
	planocontasnome?: string | null;
	planocontascodigo?: string | null;
	banconome?: string | null;
	centrocustonome?: string | null;
	ultimopagamento?: string | null;
	nomecliente: string | null;
};

type ListarFinanceirosResposta = {
	data: FinanceiroListagem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarFinanceirosService({
	idusuario,
	idempresa,
	saldo,
	q,
	emissao,
	documento,
	tipodocumentodescricao,
	emitente,
	planocontasnome,
	nossonumero,
	historico,
	emissaoInicio,
	emissaoFim,
	vencimentoInicio,
	vencimentoFim,
	vencimentooriginalInicio,
	vencimentooriginalFim,
	pagamentoInicio,
	pagamentoFim,
	baixaInicio,
	baixaFim,
	datareferenciaInicio,
	datareferenciaFim,
	entradaInicio,
	entradaFim,
	status,
	tipo,
	identidade,
	idtipocobranca,
	remessagerada,
	permiteBoleto,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarFinanceirosParametros): Promise<
	HttpResponse<ListarFinanceirosResposta>
> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return httpOk<ListarFinanceirosResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	let empresasParaBuscar: string[] = [];

	if (idempresa) {
		if (!idempresas.includes(idempresa)) {
			return httpOk<ListarFinanceirosResposta>({
				data: [],
				paginacao: {
					page,
					limit,
					total: 0,
					totalPages: 0,
				},
			});
		}
		empresasParaBuscar = [idempresa];
	} else {
		empresasParaBuscar = idempresas;
	}

	const { financeiros, total } = await listarFinanceiro({
		idempresas: empresasParaBuscar,
		saldo,
		q,
		emissao,
		documento,
		tipodocumentodescricao,
		emitente,
		planocontasnome,
		nossonumero,
		historico,
		emissaoInicio,
		emissaoFim,
		vencimentoInicio,
		vencimentoFim,
		vencimentooriginalInicio,
		vencimentooriginalFim,
		pagamentoInicio,
		pagamentoFim,
		baixaInicio,
		baixaFim,
		datareferenciaInicio,
		datareferenciaFim,
		entradaInicio,
		entradaFim,
		status,
		tipo,
		identidade,
		idtipocobranca,
		remessagerada,
		permiteBoleto,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarFinanceirosResposta>({
		data: financeiros,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
