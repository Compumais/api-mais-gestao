import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	RetornoBancario,
	RetornoBancarioItem,
} from "@/model/retorno-bancario-model.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarFinanceiroPorNossoNumero } from "@/repositories/financeiro-repositories.js";
import {
	buscarRetornoBancarioPorIdEempresa,
	buscarRetornoPorChecksum,
	criarRetornoBancario,
	criarRetornoBancarioItens,
	listarItensRetorno,
} from "@/repositories/retorno-bancario-repositories.js";
import { parseArquivoRetorno } from "@/service/retorno-bancario/parse-arquivo-retorno.js";
import {
	resolverLayoutRetorno,
	STATUS_RETORNO_BANCARIO,
	STATUS_RETORNO_ITEM,
} from "@/util/cnab-layouts.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type ImportarRetornoParametros = {
	idempresa: string;
	idusuario: string;
	idcontacorrente: string;
	nomearquivo: string;
	conteudo: string;
};

export type ResultadoImportarRetorno = {
	retorno: RetornoBancario;
	itens: RetornoBancarioItem[];
	jaExistia: boolean;
};

export async function importarRetornoBancarioService({
	idempresa,
	idusuario,
	idcontacorrente,
	nomearquivo,
	conteudo,
}: ImportarRetornoParametros): Promise<HttpResponse<ResultadoImportarRetorno>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const conta = await buscarContaCorrentePorId({ id: idcontacorrente });
	if (!conta || conta.idempresa !== idempresa) {
		return httpBadRequest("Conta corrente não encontrada");
	}

	const checksum = createHash("sha256").update(conteudo).digest("hex");
	const existente = await buscarRetornoPorChecksum(idempresa, checksum);
	if (existente) {
		const itens = await listarItensRetorno(existente.id);
		return httpOk({
			retorno: existente,
			itens,
			jaExistia: true,
		});
	}

	const layout = resolverLayoutRetorno(conta);
	const parseado = parseArquivoRetorno(conteudo, layout);
	if (parseado.itens.length === 0) {
		return httpBadRequest(
			"Nenhuma ocorrência encontrada no arquivo de retorno",
		);
	}

	const idretorno = uuidv4();
	const retorno = await criarRetornoBancario({
		id: idretorno,
		idempresa,
		idcontacorrente,
		nomearquivo: nomearquivo.slice(0, 180),
		checksum,
		layout: parseado.layoutDetectado ?? layout,
		status: STATUS_RETORNO_BANCARIO.IMPORTADO,
		idusuario,
		criadoem: new Date().toISOString(),
		processadoem: null,
	});

	if (!retorno) {
		return httpBadRequest("Falha ao gravar retorno bancário");
	}

	const itensParaCriar = [];
	for (const item of parseado.itens) {
		const titulo = item.nossonumero
			? await buscarFinanceiroPorNossoNumero({
					idempresa,
					nossonumero: item.nossonumero,
				})
			: undefined;

		itensParaCriar.push({
			id: uuidv4(),
			idretorno,
			nossonumero: item.nossonumero || null,
			numerodocumento: item.numerodocumento,
			nomesacado: item.nomesacado,
			valor: item.valor,
			valorpago: item.valorpago,
			vencimento: item.vencimento,
			datacredito: item.datacredito,
			dataocorrencia: item.dataocorrencia,
			ocorrencia: item.ocorrencia,
			ocorrenciadescricao: item.ocorrenciadescricao,
			motivo: item.motivo,
			desconto: item.desconto,
			abatimento: item.abatimento,
			juros: item.juros,
			multa: item.multa,
			outrosacrescimos: item.outrosacrescimos,
			taxacobranca: item.taxacobranca,
			valoriof: item.valoriof,
			idfinanceiro: titulo?.id ?? null,
			statusprocessamento: STATUS_RETORNO_ITEM.PENDENTE,
			mensagemerro: null,
			criadoem: new Date().toISOString(),
		});
	}

	const itens = await criarRetornoBancarioItens(itensParaCriar);
	const retornoFinal =
		(await buscarRetornoBancarioPorIdEempresa(idretorno, idempresa)) ?? retorno;

	return httpOk({
		retorno: retornoFinal,
		itens,
		jaExistia: false,
	});
}
