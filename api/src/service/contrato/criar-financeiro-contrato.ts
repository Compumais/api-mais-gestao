import { v4 as uuidv4 } from "uuid";
import type { ContratoCobranca } from "@/model/contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import {
	buscarFinanceirosPorOrigem,
	criarFinanceiro,
} from "@/repositories/financeiro-repositories.js";
import { buscarContratoPorId } from "@/repositories/contrato-repositories.js";
import { atualizarContratoCobranca } from "@/repositories/contrato-cobranca-repositories.js";
import {
	STATUS_COBRANCA_FATURAMENTO,
	TIPO_ORIGEM_FINANCEIRO_CONTRATO,
} from "@/util/contrato-constants.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { formatarValorMonetario } from "@/util/recebimentos-venda-util.js";

type CriarFinanceiroContratoParametros = {
	cobranca: ContratoCobranca;
};

type ResultadoCriarFinanceiroContrato = {
	idfinanceiro: string;
	jaExistia: boolean;
};

export async function criarFinanceiroContratoService({
	cobranca,
}: CriarFinanceiroContratoParametros): Promise<
	HttpResponse<ResultadoCriarFinanceiroContrato>
> {
	if (cobranca.idfinanceiro) {
		return httpOk({
			idfinanceiro: cobranca.idfinanceiro,
			jaExistia: true,
		});
	}

	const existentes = await buscarFinanceirosPorOrigem(
		cobranca.idempresa,
		TIPO_ORIGEM_FINANCEIRO_CONTRATO,
		cobranca.id,
	);
	if (existentes[0]) {
		await atualizarContratoCobranca(cobranca.id, {
			idfinanceiro: existentes[0].id,
			statusfaturamento: STATUS_COBRANCA_FATURAMENTO.TITULO_CRIADO,
			etapaatual: "titulo_criado",
			ultimoerro: null,
		});
		return httpOk({
			idfinanceiro: existentes[0].id,
			jaExistia: true,
		});
	}

	const contrato = await buscarContratoPorId(cobranca.idcontrato);
	if (!contrato) {
		return httpBadRequest("Contrato da cobrança não encontrado");
	}

	const cliente = await buscarEntidadePorId(contrato.identidade);
	if (!cliente) {
		return httpBadRequest("Cliente do contrato não encontrado");
	}

	const nomeCliente =
		cliente.razaosocial?.trim() || cliente.nome?.trim() || "Cliente";
	const codigo = contrato.codigo?.trim() || contrato.id.slice(0, 8);
	const dataEmissao = new Date().toISOString().substring(0, 10);
	const valor = formatarValorMonetario(Number(cobranca.valor));

	const financeiro = await criarFinanceiro({
		id: uuidv4(),
		idempresa: cobranca.idempresa,
		identidade: contrato.identidade,
		tipo: "R",
		tipoorigem: TIPO_ORIGEM_FINANCEIRO_CONTRATO,
		idorigem: cobranca.id,
		parcela: 1,
		totalparcelas: 1,
		documento: `CTR ${codigo}/${cobranca.competencia}`,
		emitente: nomeCliente,
		cnpjcpfemitente: cliente.cnpjcpf ?? null,
		idtipodocumentofinanceiro: contrato.idtipodocumento,
		idplanocontas: contrato.idplanocontas,
		idtipocobranca: contrato.idtipocobranca,
		idcontageraboleto: contrato.idcontacorrente,
		status: "A",
		emissao: dataEmissao,
		vencimento: cobranca.vencimento,
		vencimentooriginal: cobranca.vencimento,
		datareferencia: `${cobranca.competencia}-01`,
		valor,
		saldo: valor,
		historico:
			cobranca.discriminacao?.trim() ||
			`Faturamento contrato ${codigo} competência ${cobranca.competencia}`,
		registro: new Date().toISOString(),
		currenttimemillis: Date.now(),
	});

	if (!financeiro) {
		return httpBadRequest("Falha ao criar título a receber do contrato");
	}

	await atualizarContratoCobranca(cobranca.id, {
		idfinanceiro: financeiro.id,
		statusfaturamento: STATUS_COBRANCA_FATURAMENTO.TITULO_CRIADO,
		etapaatual: "titulo_criado",
		ultimoerro: null,
	});

	return httpOk({
		idfinanceiro: financeiro.id,
		jaExistia: false,
	});
}
