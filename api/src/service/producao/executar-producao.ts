import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	ORIGEM_PRODUCAO,
	type OrigemProducao,
} from "@/model/registro-producao-model.js";
import { TIPO_ITEM_PRODUCAO } from "@/model/registro-producao-item-model.js";
import type { NovoCustoProduto } from "@/model/custo-produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarFichaProducaoPorId,
	listarItensFichaProducao,
} from "@/repositories/ficha-producao-repositories.js";
import {
	atualizarProduto,
	buscarProdutoPorId,
} from "@/repositories/produtos-repositories.js";
import { criarCustoProduto } from "@/repositories/custo-produto-repositories.js";
import { criarRegistroProducaoComItens } from "@/repositories/registro-producao-repositories.js";
import { buscarSaldoEstoquePorCodigoProduto } from "@/repositories/saldo-estoque-repositories.js";
import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";
import { calcularCustoMedio } from "@/service/custo-produto/calcular-custo-medio.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	TIPO_DOCUMENTO_ESTOQUE,
	TIPO_ESTOQUE,
	tipoEstoqueAfetouFiscal,
	tipoEstoqueAfetouOperacional,
	type TipoEstoque,
} from "@/util/tipo-estoque.js";

/** origem em custoproduto / produtos.origemcusto: 2 = produção */
const ORIGEM_CUSTO_PRODUCAO = 2;

export type ExecutarProducaoParametros = {
	idficha: string;
	quantidade: string;
	idusuario: string;
	origem: OrigemProducao;
	tipoestoque?: TipoEstoque;
	idoriginal?: string | null;
	/** Quando true, não exige flag permiteproducaomassa */
	ignorarFlagMassa?: boolean;
};

export type ResultadoProducao = {
	id: string;
	idfichaproducao: string;
	idprodutoacabado: string;
	origem: number;
	quantidadeproduzida: string;
	custototal: string;
	custounitario: string;
	tipoestoque: number;
	idoriginal: string | null;
};

function parseQtd(valor: string): number {
	const n = Number.parseFloat(valor.replace(",", "."));
	return Number.isNaN(n) ? 0 : n;
}

function formatQtd(valor: number): string {
	return valor.toFixed(6);
}

function formatCusto(valor: number): string {
	return valor.toFixed(10);
}

export function resolverCustoUnitarioProduto(produto: {
	custoaquisicao?: string | null;
	customedioinicial?: string | null;
	precoultimacompra?: string | null;
}): number {
	const bruto =
		produto.custoaquisicao ??
		produto.customedioinicial ??
		produto.precoultimacompra ??
		"0";
	const n = Number.parseFloat(String(bruto));
	return Number.isNaN(n) ? 0 : n;
}

export function calcularConsumosProducao(
	itens: Array<{ idproduto: string; quantidade: string }>,
	quantidadeProduzir: number,
): Array<{ idproduto: string; quantidade: number }> {
	return itens.map((item) => ({
		idproduto: item.idproduto,
		quantidade: parseQtd(item.quantidade) * quantidadeProduzir,
	}));
}

async function validarSaldoInsumo(params: {
	idempresa: string;
	idproduto: string;
	quantidadeNecessaria: number;
	tipoestoque: TipoEstoque;
}): Promise<string | null> {
	const produto = await buscarProdutoPorId(params.idproduto);
	if (!produto?.codigo) {
		return `Produto ${params.idproduto} sem código para validar estoque`;
	}

	const saldo = await buscarSaldoEstoquePorCodigoProduto(
		params.idempresa,
		String(produto.codigo),
	);

	const operacional = parseQtd(saldo?.quantidade ?? "0");
	const fiscal = parseQtd(saldo?.quantidadefiscal ?? "0");
	const nome = produto.nome ?? String(produto.codigo);

	if (
		tipoEstoqueAfetouOperacional(params.tipoestoque) &&
		operacional + 0.000001 < params.quantidadeNecessaria
	) {
		return `Estoque operacional insuficiente de ${nome}: disponível ${operacional.toFixed(6)}, necessário ${params.quantidadeNecessaria.toFixed(6)}`;
	}

	if (
		tipoEstoqueAfetouFiscal(params.tipoestoque) &&
		fiscal + 0.000001 < params.quantidadeNecessaria
	) {
		return `Estoque fiscal insuficiente de ${nome}: disponível ${fiscal.toFixed(6)}, necessário ${params.quantidadeNecessaria.toFixed(6)}`;
	}

	return null;
}

export async function executarProducaoService({
	idficha,
	quantidade,
	idusuario,
	origem,
	tipoestoque = TIPO_ESTOQUE.AMBOS,
	idoriginal = null,
	ignorarFlagMassa = false,
}: ExecutarProducaoParametros): Promise<HttpResponse<ResultadoProducao>> {
	const ficha = await buscarFichaProducaoPorId(idficha);
	if (!ficha) {
		return httpNaoEncontrado();
	}

	if (ficha.ativo !== 1) {
		return httpBadRequest("Ficha de produção inativa");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		ficha.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (
		origem === ORIGEM_PRODUCAO.MASSA &&
		!ignorarFlagMassa &&
		ficha.permiteproducaomassa !== 1
	) {
		return httpBadRequest(
			"Esta ficha não permite produção em massa",
		);
	}

	if (origem === ORIGEM_PRODUCAO.VENDA && ficha.producaonavenda !== 1) {
		return httpBadRequest(
			"Esta ficha não permite produção na venda",
		);
	}

	const qtdProduzir = parseQtd(quantidade);
	if (qtdProduzir <= 0) {
		return httpBadRequest("Quantidade a produzir deve ser maior que zero");
	}

	const itensFicha = await listarItensFichaProducao(idficha);
	if (itensFicha.length === 0) {
		return httpBadRequest("Ficha sem componentes");
	}

	const consumos = calcularConsumosProducao(itensFicha, qtdProduzir);

	for (const consumo of consumos) {
		if (consumo.quantidade <= 0) continue;
		const erroSaldo = await validarSaldoInsumo({
			idempresa: ficha.idempresa,
			idproduto: consumo.idproduto,
			quantidadeNecessaria: consumo.quantidade,
			tipoestoque,
		});
		if (erroSaldo) {
			return httpBadRequest(erroSaldo);
		}
	}

	const idRegistro = uuidv4();
	const agora = new Date();
	const dataIso = agora.toISOString().slice(0, 10);
	const dataHoraIso = agora.toISOString();

	let custoTotalProducao = 0;
	const itensRegistro: Array<{
		id: string;
		idregistroproducao: string;
		idproduto: string;
		tipo: number;
		quantidade: string;
		custounitario: string;
		custototal: string;
	}> = [];

	try {
		for (const consumo of consumos) {
			if (consumo.quantidade <= 0) continue;

			const produtoInsumo = await buscarProdutoPorId(consumo.idproduto);
			if (!produtoInsumo) {
				return httpBadRequest(`Insumo ${consumo.idproduto} não encontrado`);
			}

			const custoUnit = resolverCustoUnitarioProduto(produtoInsumo);
			const custoLinha = custoUnit * consumo.quantidade;
			custoTotalProducao += custoLinha;

			await registrarMovimentoEstoque({
				idempresa: ficha.idempresa,
				idproduto: consumo.idproduto,
				quantidade: formatQtd(consumo.quantidade),
				sentido: "saida",
				tipoestoque,
				tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PRODUCAO,
				idoriginal: idRegistro,
				iditemoriginal: consumo.idproduto,
				data: dataIso,
				datahora: dataHoraIso,
				custoaquisicao: formatCusto(custoUnit),
				customedio: formatCusto(custoUnit),
				custototal: formatCusto(custoLinha),
				valortotal: custoLinha.toFixed(2),
				observacao: "Consumo produção",
				permitirSemLote: true,
			});

			itensRegistro.push({
				id: uuidv4(),
				idregistroproducao: idRegistro,
				idproduto: consumo.idproduto,
				tipo: TIPO_ITEM_PRODUCAO.CONSUMO,
				quantidade: formatQtd(consumo.quantidade),
				custounitario: formatCusto(custoUnit),
				custototal: formatCusto(custoLinha),
			});
		}

		const custoUnitarioAcabado =
			qtdProduzir > 0 ? custoTotalProducao / qtdProduzir : 0;

		await registrarMovimentoEstoque({
			idempresa: ficha.idempresa,
			idproduto: ficha.idprodutoacabado,
			quantidade: formatQtd(qtdProduzir),
			sentido: "entrada",
			tipoestoque,
			tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PRODUCAO,
			idoriginal: idRegistro,
			iditemoriginal: ficha.idprodutoacabado,
			data: dataIso,
			datahora: dataHoraIso,
			custoaquisicao: formatCusto(custoUnitarioAcabado),
			customedio: formatCusto(custoUnitarioAcabado),
			custototal: formatCusto(custoTotalProducao),
			valortotal: custoTotalProducao.toFixed(2),
			observacao: "Entrada produção",
			permitirSemLote: true,
		});

		itensRegistro.push({
			id: uuidv4(),
			idregistroproducao: idRegistro,
			idproduto: ficha.idprodutoacabado,
			tipo: TIPO_ITEM_PRODUCAO.PRODUCAO,
			quantidade: formatQtd(qtdProduzir),
			custounitario: formatCusto(custoUnitarioAcabado),
			custototal: formatCusto(custoTotalProducao),
		});

		const criado = await criarRegistroProducaoComItens(
			{
				id: idRegistro,
				idempresa: ficha.idempresa,
				idfichaproducao: ficha.id,
				idprodutoacabado: ficha.idprodutoacabado,
				origem,
				quantidadeproduzida: formatQtd(qtdProduzir),
				custototal: formatCusto(custoTotalProducao),
				custounitario: formatCusto(custoUnitarioAcabado),
				idoriginal: idoriginal,
				tipoestoque,
				idusuario,
				status: 1,
				datahora: dataHoraIso,
				currenttimemillis: Date.now(),
			},
			itensRegistro,
		);

		if (!criado) {
			return httpErroInterno();
		}

		const produtoAcabado = await buscarProdutoPorId(ficha.idprodutoacabado);
		const custoMedio = calcularCustoMedio(
			produtoAcabado?.customedioinicial,
			formatCusto(custoUnitarioAcabado),
		);

		const novoCusto: NovoCustoProduto = {
			id: uuidv4(),
			idproduto: ficha.idprodutoacabado,
			custo: formatCusto(custoUnitarioAcabado),
			custoaquisicao: formatCusto(custoUnitarioAcabado),
			customedio: custoMedio,
			precocompra: formatCusto(custoUnitarioAcabado),
			origem: ORIGEM_CUSTO_PRODUCAO,
			idregistroproducao: idRegistro,
			idultimousuario: idusuario,
			status: 1,
			datahora: dataHoraIso,
			currenttimemillis: Date.now(),
		};

		await criarCustoProduto(novoCusto);
		await atualizarProduto(ficha.idprodutoacabado, {
			custoaquisicao: formatCusto(custoUnitarioAcabado),
			customedioinicial: custoMedio,
			origemcusto: ORIGEM_CUSTO_PRODUCAO,
		});

		const body: ResultadoProducao = {
			id: idRegistro,
			idfichaproducao: ficha.id,
			idprodutoacabado: ficha.idprodutoacabado,
			origem,
			quantidadeproduzida: formatQtd(qtdProduzir),
			custototal: formatCusto(custoTotalProducao),
			custounitario: formatCusto(custoUnitarioAcabado),
			tipoestoque,
			idoriginal: idoriginal,
		};

		return origem === ORIGEM_PRODUCAO.MASSA
			? httpCriacao(body)
			: httpOk(body);
	} catch (erro) {
		console.error("[producao] Falha ao executar produção:", erro);
		const mensagem =
			erro instanceof Error ? erro.message : "Falha ao executar produção";
		return httpBadRequest(mensagem);
	}
}
