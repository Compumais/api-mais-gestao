import type { HttpResponse } from "@/model/http-model.js";
import { listarDocumentosExistentesPorConta } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { verificarContaCorrentePertenceEmpresa } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpErro,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";
import { parsearOfx, type TransacaoOfx } from "@/util/parse-ofx.js";

export type StatusPreviewImportacaoOfx = "pendente" | "duplicada";

export type LinhaPreviewImportacaoOfx = TransacaoOfx & {
	status: StatusPreviewImportacaoOfx;
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

	const documentos = transacoes
		.map((transacao) => transacao.documento)
		.filter((documento): documento is string => !!documento);

	const documentosExistentes = new Set(
		await listarDocumentosExistentesPorConta({
			idcontacorrente,
			documentos,
		}),
	);

	const linhas: LinhaPreviewImportacaoOfx[] = transacoes.map((transacao) => ({
		...transacao,
		status:
			transacao.documento && documentosExistentes.has(transacao.documento)
				? "duplicada"
				: "pendente",
	}));

	return httpOk(linhas);
}
