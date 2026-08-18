import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import { db } from "@/repositories/connection.js";
import {
	buscarContaCorrenteCaixaPadrao,
	criarContaCorrenteCaixaPadrao,
} from "@/repositories/conta-corrente-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarPlanoContasPorCodigo } from "@/repositories/plano-contas-repositories.js";
import { inserirLancamentoCaixa } from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import {
	CODIGO_PLANO_VENDAS_PREPAGO,
	formatarDataIso,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";

type RegistrarRecebimentosVendaParametros = {
	venda: VendaPdvGourmet;
	idusuario: string;
};

type ResultadoRegistroRecebimentos =
	| { success: true }
	| { success: false; mensagem: string };

export async function registrarRecebimentosVendaService({
	venda,
	idusuario,
}: RegistrarRecebimentosVendaParametros): Promise<ResultadoRegistroRecebimentos> {
	const empresa = await buscarEmpresaPorId(venda.idempresa);

	if (!empresa) {
		return { success: false, mensagem: "Empresa não encontrada" };
	}

	const valorPrepago = parseValorMonetario(venda.valorprepago);
	if (valorPrepago <= 0) {
		return { success: true };
	}

	let caixa = await buscarContaCorrenteCaixaPadrao(venda.idempresa);

	if (!caixa) {
		caixa = await criarContaCorrenteCaixaPadrao(venda.idempresa);
	}

	if (!caixa) {
		return { success: false, mensagem: "Conta corrente Caixa não encontrada" };
	}

	const plano = await buscarPlanoContasPorCodigo(
		venda.idempresa,
		CODIGO_PLANO_VENDAS_PREPAGO,
	);

	if (!plano) {
		return {
			success: false,
			mensagem: `Conta do plano de contas não encontrada: ${CODIGO_PLANO_VENDAS_PREPAGO}`,
		};
	}

	try {
		await db.transaction(async (tx) => {
			await inserirLancamentoCaixa(tx, {
				idcontacorrente: caixa.id,
				idusuario,
				idplanocontas: plano.id,
				valor: valorPrepago,
				historico: `Venda PDV #${venda.numeropdv} - Pré-pago`,
				documento: `PDV ${venda.numeropdv}`,
				datahora: formatarDataIso(new Date()),
			});
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
