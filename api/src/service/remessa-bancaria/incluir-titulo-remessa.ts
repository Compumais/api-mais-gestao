import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { atualizaContaCorrente } from "@/repositories/conta-corrente-repositories.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceiroPorId,
} from "@/repositories/financeiro-repositories.js";
import {
	atualizarRemessaBancaria,
	buscarRemessaAbertaPorConta,
	buscarRemessaItemPorFinanceiro,
	criarRemessaBancaria,
	criarRemessaBancariaItem,
	listarItensRemessa,
} from "@/repositories/remessa-bancaria-repositories.js";
import { montarArquivoRemessa } from "@/service/remessa-bancaria/montar-arquivo-remessa.js";
import { buscarBancoPorId } from "@/repositories/banco-repositories.js";
import { STATUS_REMESSA_BANCARIA } from "@/util/contrato-constants.js";
import { resolverLayoutRemessa } from "@/util/cnab-layouts.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";

type IncluirTituloRemessaParametros = {
	idempresa: string;
	idusuario: string;
	idfinanceiro: string;
	idcontacorrente: string;
	idcobranca?: string | null;
};

export type ResultadoIncluirRemessa = {
	idremessa: string;
	idremessaitem: string;
	jaExistia: boolean;
};

export async function incluirTituloRemessaService({
	idempresa,
	idusuario,
	idfinanceiro,
	idcontacorrente,
	idcobranca,
}: IncluirTituloRemessaParametros): Promise<
	HttpResponse<ResultadoIncluirRemessa>
> {
	const existente = await buscarRemessaItemPorFinanceiro(idfinanceiro);
	if (existente) {
		return httpOk({
			idremessa: existente.idremessa,
			idremessaitem: existente.id,
			jaExistia: true,
		});
	}

	const titulo = await buscarFinanceiroPorId(idfinanceiro);
	if (!titulo || titulo.idempresa !== idempresa) {
		return httpBadRequest("Título não encontrado");
	}
	if (!titulo.nossonumero) {
		return httpBadRequest("Título sem boleto gerado");
	}

	const conta = await buscarContaCorrentePorId({ id: idcontacorrente });
	if (!conta || conta.idempresa !== idempresa) {
		return httpBadRequest("Conta corrente não encontrada");
	}

	const layout = resolverLayoutRemessa(conta);

	let remessa = await buscarRemessaAbertaPorConta(idempresa, idcontacorrente);
	if (!remessa) {
		const sequencia = (conta.sequenciaremessa ?? 0) + 1;
		await atualizaContaCorrente({
			id: idcontacorrente,
			dados: { sequenciaremessa: sequencia },
		});
		remessa = await criarRemessaBancaria({
			id: uuidv4(),
			idempresa,
			idcontacorrente,
			sequencia,
			layout,
			status: STATUS_REMESSA_BANCARIA.ABERTA,
			nomearquivo: `remessa_${sequencia}.rem`,
			conteudo: null,
			idusuario,
			criadoem: new Date().toISOString(),
			atualizadoem: new Date().toISOString(),
			enviadaem: null,
		});
	}

	if (!remessa) {
		return httpBadRequest("Falha ao criar remessa bancária");
	}

	const item = await criarRemessaBancariaItem({
		id: uuidv4(),
		idremessa: remessa.id,
		idfinanceiro,
		idcobranca: idcobranca ?? null,
		nossonumero: titulo.nossonumero,
		criadoem: new Date().toISOString(),
	});

	if (!item) {
		const novamente = await buscarRemessaItemPorFinanceiro(idfinanceiro);
		if (novamente) {
			return httpOk({
				idremessa: novamente.idremessa,
				idremessaitem: novamente.id,
				jaExistia: true,
			});
		}
		return httpBadRequest("Falha ao incluir título na remessa");
	}

	await atualizarFinanceiro(idfinanceiro, { remessagerada: 1 });

	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa) {
		return httpBadRequest("Empresa não encontrada");
	}

	const itens = await listarItensRemessa(remessa.id);
	const titulosRemessa = [];
	for (const remessaItem of itens) {
		const fin = await buscarFinanceiroPorId(remessaItem.idfinanceiro);
		if (!fin) continue;
		const cliente = fin.identidade
			? await buscarEntidadePorId(fin.identidade)
			: null;
		titulosRemessa.push({
			titulo: fin,
			item: remessaItem,
			sacadoNome:
				cliente?.razaosocial?.trim() ||
				cliente?.nome?.trim() ||
				fin.emitente ||
				"Sacado",
			sacadoDocumento: cliente?.cnpjcpf ?? fin.cnpjcpfemitente ?? "",
		});
	}

	const banco = conta.idbanco ? await buscarBancoPorId(conta.idbanco) : null;
	const arquivo = montarArquivoRemessa({
		empresa,
		conta,
		sequencia: remessa.sequencia,
		titulos: titulosRemessa,
		codigoBanco: banco?.codigo,
		layout,
	});

	await atualizarRemessaBancaria(remessa.id, {
		conteudo: arquivo.conteudo,
		layout: arquivo.layout,
		status: STATUS_REMESSA_BANCARIA.GERADA,
		nomearquivo:
			remessa.nomearquivo ??
			`remessa_${remessa.sequencia}.${arquivo.extensao}`,
	});

	return httpOk({
		idremessa: remessa.id,
		idremessaitem: item.id,
		jaExistia: false,
	});
}
