import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import {
	buscarContaCorrenteCaixaPadrao,
	criarContaCorrenteCaixaPadrao,
} from "@/repositories/conta-corrente-repositories.js";
import { db } from "@/repositories/connection.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarPlanoContasPorCodigo } from "@/repositories/plano-contas-repositories.js";
import {
	adicionarDias,
	CODIGO_PLANO_VENDAS_CARTAO_CREDITO,
	CODIGO_PLANO_VENDAS_CARTAO_DEBITO,
	CODIGO_PLANO_VENDAS_PREPAGO,
	formatarDataIso,
	formatarValorMonetario,
	parseValorMonetario,
	TIPO_ORIGEM_VENDA_PDV,
} from "@/util/recebimentos-venda-util.js";
import { inserirLancamentoCaixa } from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import * as schema from "../../../drizzle/schema.js";

type RegistrarRecebimentosVendaParametros = {
	venda: VendaPdvGourmet;
	idusuario: string;
};

type ResultadoRegistroRecebimentos =
	| { success: true }
	| { success: false; mensagem: string };

type LancamentoImediato = {
	valor: number;
	codigoPlanoContas: string;
	historico: string;
};

type TituloFuturo = {
	valor: number;
	codigoPlanoContas: string;
	prazoDias: number;
	historico: string;
};

type TransacaoDb = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function inserirTituloReceber(
	tx: TransacaoDb,
	parametros: {
		venda: VendaPdvGourmet;
		valor: number;
		idplanocontas: string;
		vencimento: string;
		historico: string;
		dataEmissao: string;
	},
): Promise<void> {
	await tx.insert(schema.financeiro).values({
		id: uuidv4(),
		idempresa: parametros.venda.idempresa,
		tipo: "R",
		status: "A",
		emissao: parametros.dataEmissao,
		vencimento: parametros.vencimento,
		vencimentooriginal: parametros.vencimento,
		valor: formatarValorMonetario(parametros.valor),
		saldo: formatarValorMonetario(parametros.valor),
		historico: parametros.historico,
		documento: parametros.venda.id,
		idplanocontas: parametros.idplanocontas,
		tipoorigem: TIPO_ORIGEM_VENDA_PDV,
		idorigem: parametros.venda.id,
		currenttimemillis: Date.now(),
	});
}

export async function registrarRecebimentosVendaService({
	venda,
	idusuario,
}: RegistrarRecebimentosVendaParametros): Promise<ResultadoRegistroRecebimentos> {
	const empresa = await buscarEmpresaPorId(venda.idempresa);

	if (!empresa) {
		return { success: false, mensagem: "Empresa não encontrada" };
	}

	let caixa = await buscarContaCorrenteCaixaPadrao(venda.idempresa);

	if (!caixa) {
		caixa = await criarContaCorrenteCaixaPadrao(venda.idempresa);
	}

	if (!caixa) {
		return { success: false, mensagem: "Conta corrente Caixa não encontrada" };
	}

	const valorPrepago = parseValorMonetario(venda.valorprepago);
	let valorCartaoCredito = parseValorMonetario(venda.valorcartaocredito);
	let valorCartaoDebito = parseValorMonetario(venda.valorcartaodebito);

	if (valorCartaoCredito === 0 && valorCartaoDebito === 0) {
		valorCartaoCredito = parseValorMonetario(venda.valorcartao);
	}

	const lancamentosImediatos: LancamentoImediato[] = [];

	// Dinheiro e PIX são consolidados no fechamento do caixa (ver consolidar-recebimentos-fechamento.ts)

	if (valorPrepago > 0) {
		lancamentosImediatos.push({
			valor: valorPrepago,
			codigoPlanoContas: CODIGO_PLANO_VENDAS_PREPAGO,
			historico: `Venda PDV #${venda.numeropdv} - Pré-pago`,
		});
	}

	const titulosFuturos: TituloFuturo[] = [];

	if (valorCartaoCredito > 0) {
		titulosFuturos.push({
			valor: valorCartaoCredito,
			codigoPlanoContas: CODIGO_PLANO_VENDAS_CARTAO_CREDITO,
			prazoDias: empresa.prazocartaocredito ?? 30,
			historico: `Venda PDV #${venda.numeropdv} - Cartão Crédito`,
		});
	}

	if (valorCartaoDebito > 0) {
		titulosFuturos.push({
			valor: valorCartaoDebito,
			codigoPlanoContas: CODIGO_PLANO_VENDAS_CARTAO_DEBITO,
			prazoDias: empresa.prazocartaodebito ?? 1,
			historico: `Venda PDV #${venda.numeropdv} - Cartão Débito`,
		});
	}

	if (lancamentosImediatos.length === 0 && titulosFuturos.length === 0) {
		return { success: true };
	}

	const codigosPlano = [
		...new Set([
			...lancamentosImediatos.map((item) => item.codigoPlanoContas),
			...titulosFuturos.map((item) => item.codigoPlanoContas),
		]),
	];

	const planosPorCodigo = new Map<string, string>();

	for (const codigo of codigosPlano) {
		const plano = await buscarPlanoContasPorCodigo(venda.idempresa, codigo);

		if (!plano) {
			return {
				success: false,
				mensagem: `Conta do plano de contas não encontrada: ${codigo}`,
			};
		}

		planosPorCodigo.set(codigo, plano.id);
	}

	const dataHoje = formatarDataIso(new Date());
	const dataBase = new Date();

	try {
		await db.transaction(async (tx) => {
			for (const lancamento of lancamentosImediatos) {
				const idplanocontas = planosPorCodigo.get(lancamento.codigoPlanoContas);

				if (!idplanocontas) {
					throw new Error(
						`Plano de contas não resolvido: ${lancamento.codigoPlanoContas}`,
					);
				}

				await inserirLancamentoCaixa(tx, {
					idcontacorrente: caixa.id,
					idusuario,
					idplanocontas,
					valor: lancamento.valor,
					historico: lancamento.historico,
					documento: venda.id,
					datahora: dataHoje,
				});
			}

			for (const titulo of titulosFuturos) {
				const idplanocontas = planosPorCodigo.get(titulo.codigoPlanoContas);

				if (!idplanocontas) {
					throw new Error(
						`Plano de contas não resolvido: ${titulo.codigoPlanoContas}`,
					);
				}

				await inserirTituloReceber(tx, {
					venda,
					valor: titulo.valor,
					idplanocontas,
					vencimento: adicionarDias(dataBase, titulo.prazoDias),
					historico: titulo.historico,
					dataEmissao: dataHoje,
				});
			}
		});

		return { success: true };
	} catch (error) {
		console.error("Erro ao registrar recebimentos da venda:", error);
		return {
			success: false,
			mensagem: "Falha ao registrar recebimentos da venda no plano de contas",
		};
	}
}
