import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	ConciliacaoCielo,
	ConciliacaoCieloItem,
} from "@/model/conciliacao-cielo-model.js";
import {
	STATUS_CONCILIACAO_CIELO,
	STATUS_CONCILIACAO_CIELO_ITEM,
} from "@/model/conciliacao-cielo-model.js";
import {
	buscarConciliacaoCieloPorChecksum,
	criarConciliacaoCielo,
	criarConciliacaoCieloItens,
	listarItensConciliacaoCielo,
	listarTitulosReceberParaCielo,
} from "@/repositories/conciliacao-cielo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { parseArquivoRecebiveisCielo } from "@/util/parse-csv-cielo.js";
import { sugerirMatchCielo } from "@/util/sugerir-match-cielo.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type ImportarParametros = {
	idempresa: string;
	idusuario: string;
	nomearquivo: string;
	conteudo: string;
};

export type ResultadoImportarConciliacaoCielo = {
	conciliacao: ConciliacaoCielo;
	itens: ConciliacaoCieloItem[];
	jaExistia: boolean;
};

export async function importarConciliacaoCieloService({
	idempresa,
	idusuario,
	nomearquivo,
	conteudo,
}: ImportarParametros): Promise<
	HttpResponse<ResultadoImportarConciliacaoCielo>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	let parseado;
	try {
		parseado = parseArquivoRecebiveisCielo(conteudo);
	} catch (error) {
		return httpBadRequest(
			error instanceof Error ? error.message : "CSV Cielo inválido",
		);
	}

	const checksum = createHash("sha256").update(conteudo).digest("hex");
	const existente = await buscarConciliacaoCieloPorChecksum(idempresa, checksum);
	if (existente) {
		const itensExistentes = await listarItensConciliacaoCielo(existente.id);
		return httpOk({
			conciliacao: existente,
			itens: itensExistentes.map((registro) => registro.item),
			jaExistia: true,
		});
	}

	const titulos = await listarTitulosReceberParaCielo({
		idempresa,
		datainicio: parseado.periodoinicio,
		datafim: parseado.periodofim,
	});

	const id = uuidv4();
	const conciliacao = await criarConciliacaoCielo({
		id,
		idempresa,
		nomearquivo: nomearquivo.slice(0, 180),
		checksum,
		estabelecimento: parseado.estabelecimento,
		periodoinicio: parseado.periodoinicio,
		periodofim: parseado.periodofim,
		qtdlancamentos: parseado.qtdlancamentos,
		valorbruto: parseado.valorbruto,
		valortaxa: parseado.valortaxa,
		valorliquido: parseado.valorliquido,
		status: STATUS_CONCILIACAO_CIELO.IMPORTADO,
		idusuario,
		criadoem: new Date().toISOString(),
		processadoem: null,
	});

	if (!conciliacao) {
		return httpBadRequest("Falha ao gravar a conciliação Cielo");
	}

	const itens = await criarConciliacaoCieloItens(
		parseado.itens.map((linha) => {
			const sugestao = sugerirMatchCielo(linha, titulos);
			return {
				id: uuidv4(),
				idconciliacao: id,
				linhacsv: linha.linhacsv,
				datapagamento: linha.datapagamento,
				datalancamento: linha.datalancamento,
				dataprevistapagamento: linha.dataprevistapagamento,
				datavenda: linha.datavenda,
				estabelecimento: linha.estabelecimento,
				tipolancamento: linha.tipolancamento,
				formapagamento: linha.formapagamento,
				bandeira: linha.bandeira,
				valorbruto: linha.valorbruto,
				valortaxa: linha.valortaxa,
				valorliquido: linha.valorliquido,
				statuspagamento: linha.statuspagamento,
				descricao: linha.descricao,
				codigoautorizacao: linha.codigoautorizacao,
				nsu: linha.nsu,
				codigovenda: linha.codigovenda,
				tid: linha.tid,
				numerocartao: linha.numerocartao,
				numeropedido: linha.numeropedido,
				parcela: linha.parcela,
				totalparcelas: linha.totalparcelas,
				modalidade: linha.modalidade,
				idfinanceiro: sugestao.idfinanceiro,
				idfinanceirosugerido: sugestao.idfinanceiro,
				confiancasugestao: sugestao.confianca,
				statusprocessamento: sugestao.idfinanceiro
					? STATUS_CONCILIACAO_CIELO_ITEM.ASSOCIADO
					: STATUS_CONCILIACAO_CIELO_ITEM.PENDENTE,
				mensagemerro: sugestao.motivo,
				criadoem: new Date().toISOString(),
			};
		}),
	);

	return httpOk({
		conciliacao,
		itens,
		jaExistia: false,
	});
}
