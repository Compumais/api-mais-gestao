import type { HttpResponse } from "@/model/http-model.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarVendasPdvGourmet } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { listarVendaPdvPagamentosPorVendas } from "@/repositories/venda-pdv-pagamento-repositories.js";
import {
	type DocumentoVendaPdv,
	documentoHistoricoVendaPdv,
	meiosPagamentoHistoricoVendaPdv,
} from "@/util/historico-venda-pdv.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarVendasPdvGourmetParametros = {
	idusuario: string;
	idempresa: string;
	idcontamesa?: string | undefined;
	numeropdv?: number | undefined;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	page?: number;
	limit?: number;
};

export type NfceHistoricoVendaPdv = {
	idnotafiscal: string;
	status: number | null;
	chave: string | null;
	serie: string | null;
	numero: string | null;
};

export type VendaPdvGourmetListagem = VendaPdvGourmet & {
	operadorNome: string | null;
	meiosPagamento: string[];
	documento: DocumentoVendaPdv;
	nfce: NfceHistoricoVendaPdv | null;
};

type ListarVendasPdvGourmetResposta = {
	data: VendaPdvGourmetListagem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarVendasPdvGourmetService({
	idusuario,
	idempresa,
	idcontamesa,
	numeropdv,
	dataInicio,
	dataFim,
	page = 1,
	limit = 10,
}: ListarVendasPdvGourmetParametros): Promise<
	HttpResponse<ListarVendasPdvGourmetResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarVendasPdvGourmet({
		idempresa,
		idcontamesa,
		numeropdv,
		dataInicio,
		dataFim,
		page,
		limit,
	});

	const pagamentos = await listarVendaPdvPagamentosPorVendas(
		resultado.vendas.map((venda) => venda.id),
	);
	const pagamentosPorVenda = new Map<string, typeof pagamentos>();
	for (const pagamento of pagamentos) {
		const lista = pagamentosPorVenda.get(pagamento.idvenda) ?? [];
		lista.push(pagamento);
		pagamentosPorVenda.set(pagamento.idvenda, lista);
	}

	const data: VendaPdvGourmetListagem[] = resultado.vendas.map((venda) => ({
		...venda,
		operadorNome: venda.operadorNome,
		meiosPagamento: meiosPagamentoHistoricoVendaPdv({
			pagamentos: pagamentosPorVenda.get(venda.id) ?? [],
			valordinheiro: venda.valordinheiro,
			valorpix: venda.valorpix,
			valorcartaocredito: venda.valorcartaocredito,
			valorcartaodebito: venda.valorcartaodebito,
			valorcartao: venda.valorcartao,
			valorprepago: venda.valorprepago,
		}),
		documento: documentoHistoricoVendaPdv({
			idnotafiscalnfce: venda.idnotafiscalnfce,
			deveemitirnfce: venda.deveemitirnfce,
		}),
		nfce: venda.nfce,
	}));

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarVendasPdvGourmetResposta>({
		data,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
