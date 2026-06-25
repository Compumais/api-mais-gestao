import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarLancamentosExistentesPorChaves,
} from "@/repositories/conta-corrente-lancamento-repositories.js";
import { verificarContaCorrentePertenceEmpresa } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { montarChaveLancamentoExistente } from "@/util/chave-lancamento-conta-corrente.js";
import {
	httpErro,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";
import { parsearOfx, type TransacaoOfx } from "@/util/parse-ofx.js";

export type StatusPreviewImportacaoOfx = "pendente" | "existente";

export type LinhaPreviewImportacaoOfx = TransacaoOfx & {
	status: StatusPreviewImportacaoOfx;
	idLancamentoExistente?: string;
	idplanocontasExistente?: string | null;
};

export async function previewImportacaoOfxService(
	idcontacorrente: string,
	conteudoOfx: string,
	usuarioId: string,
	idempresa: string,
): Promise<HttpResponse<LinhaPreviewImportacaoOfx[]>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		usuarioId,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoAutorizado();
	}

	const contaCorrentePertenceEmpresa =
		await verificarContaCorrentePertenceEmpresa({
			idcontacorrente,
			idempresa,
		});

	if (!contaCorrentePertenceEmpresa) {
		return httpNaoEncontrado();
	}

	if (!conteudoOfx.trim()) {
		return httpErro();
	}

	let transacoes: TransacaoOfx[];

	try {
		transacoes = parsearOfx(conteudoOfx);
	} catch (error) {
		const mensagem =
			error instanceof Error ? error.message : "Arquivo OFX inválido";
		return {
			success: false,
			status: 400,
			error: mensagem,
			code: "OFX_PARSE_ERROR",
		};
	}

	const chaves = transacoes.map((transacao) => ({
		data: transacao.data,
		valor: transacao.valor,
		tipo: transacao.tipo,
	}));

	const lancamentosExistentes = await buscarLancamentosExistentesPorChaves({
		idcontacorrente,
		chaves,
	});

	const linhas: LinhaPreviewImportacaoOfx[] = transacoes.map((transacao) => {
		const chave = montarChaveLancamentoExistente({
			data: transacao.data,
			valor: transacao.valor,
			tipo: transacao.tipo,
		});
		const existente = lancamentosExistentes.get(chave);

		if (existente) {
			return {
				...transacao,
				status: "existente",
				idLancamentoExistente: existente.id,
				idplanocontasExistente: existente.idplanocontas,
			};
		}

		return {
			...transacao,
			status: "pendente",
		};
	});

	return httpOk(linhas);
}
