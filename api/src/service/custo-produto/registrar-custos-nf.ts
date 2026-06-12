import { v4 as uuidv4 } from "uuid";
import type { CustoProduto, NovoCustoProduto } from "@/model/custo-produto-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { registrarCustosNfEmTransacao } from "@/repositories/custo-produto-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import { calcularCustoMedio } from "./calcular-custo-medio.js";

/** origem em custoproduto: 0 = NF de compra */
const ORIGEM_NF = 0;
/** status ativo */
const STATUS_ATIVO = 1;
/** origemcusto em produtos: 0 = NF */
const ORIGEM_CUSTO_NF = 0;

export type ItemCustoNf = {
	idproduto: string;
	precocompra: string;
	custo?: string | undefined;
	desconto?: string | undefined;
	fretesegurooutrasdesp?: string | undefined;
	ipi?: string | undefined;
	icmsst?: string | undefined;
	fcpst?: string | undefined;
	piscofins?: string | undefined;
	icmsfcp?: string | undefined;
	icmsdesonerado?: string | undefined;
	diferencialicms?: string | undefined;
	freteconhecimento?: string | undefined;
	icmspiscofinsconhecimento?: string | undefined;
	vendor?: string | undefined;
	adicional?: string | undefined;
};

type RegistrarCustosNfParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal?: string | undefined;
	idfilial?: string | undefined;
	itens: ItemCustoNf[];
};

export async function registrarCustosNfService({
	idusuario,
	idempresa,
	idnotafiscal,
	idfilial,
	itens,
}: RegistrarCustosNfParametros): Promise<HttpResponse<CustoProduto[]>> {
	if (itens.length === 0) {
		return httpBadRequest("Informe ao menos um item da nota fiscal");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const datahoraAtual = new Date().toISOString();
	const dataCompraAtual = datahoraAtual.slice(0, 10);

	const custosParaInserir: NovoCustoProduto[] = [];
	const atualizacoesProdutos: Array<{
		id: string;
		dados: {
			precoultimacompra: string;
			custoaquisicao: string;
			customedioinicial: string;
			dataultimacompra: string;
			origemcusto: number;
		};
	}> = [];

	for (const item of itens) {
		const produto = await buscarProdutoPorId(item.idproduto);

		if (!produto || produto.idempresa !== idempresa) {
			return httpBadRequest(
				`Produto ${item.idproduto} não encontrado ou não pertence à empresa`,
			);
		}

		const custoEntrada = item.custo ?? item.precocompra;
		const custoMedio = calcularCustoMedio(
			produto.customedioinicial ?? produto.custoaquisicao,
			custoEntrada,
		);

		const custoId = uuidv4();

		custosParaInserir.push({
			id: custoId,
			idproduto: item.idproduto,
			idnotafiscal: idnotafiscal ?? null,
			idfilial: idfilial ?? null,
			idultimousuario: idusuario,
			precocompra: item.precocompra,
			custo: custoEntrada,
			custoaquisicao: custoEntrada,
			customedio: custoMedio,
			desconto: item.desconto ?? null,
			fretesegurooutrasdesp: item.fretesegurooutrasdesp ?? null,
			ipi: item.ipi ?? null,
			icmsst: item.icmsst ?? null,
			fcpst: item.fcpst ?? null,
			piscofins: item.piscofins ?? null,
			icmsfcp: item.icmsfcp ?? null,
			icmsdesonerado: item.icmsdesonerado ?? null,
			diferencialicms: item.diferencialicms ?? null,
			freteconhecimento: item.freteconhecimento ?? null,
			icmspiscofinsconhecimento: item.icmspiscofinsconhecimento ?? null,
			vendor: item.vendor ?? null,
			adicional: item.adicional ?? null,
			origem: ORIGEM_NF,
			status: STATUS_ATIVO,
			datahora: datahoraAtual,
			currenttimemillis: Date.now(),
		});

		atualizacoesProdutos.push({
			id: item.idproduto,
			dados: {
				precoultimacompra: item.precocompra,
				custoaquisicao: custoEntrada,
				customedioinicial: custoMedio,
				dataultimacompra: dataCompraAtual,
				origemcusto: ORIGEM_CUSTO_NF,
			},
		});
	}

	const custosCriados = await registrarCustosNfEmTransacao(
		custosParaInserir,
		atualizacoesProdutos,
	);

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "registrar_custo_nf",
		idusuario,
		recurso: "custo_produto",
		idrecurso: custosCriados[0]?.id ?? auditoriaId,
		idempresa,
		criadoem: datahoraAtual,
		metadados: {
			idnotafiscal: idnotafiscal ?? null,
			quantidadeItens: itens.length,
			idsCustos: custosCriados.map((c) => c.id),
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	return httpCriacao<CustoProduto[]>(custosCriados);
}
