import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import { criarRascunhoImportacaoNfService } from "@/service/nota-fiscal/importacao/criar-rascunho-importacao-nf.js";

import { httpBadRequest } from "@/util/http-util.js";
import { parseNFeXml } from "@/util/nfe-xml-parser.js";

type ImportarXmlNfParametros = {
	idusuario: string;

	idempresa: string;

	xml: string;

	idplanocontas?: string | undefined;

	idcondicaopagto?: string | undefined;

	idtipodocumento?: string | undefined;

	idoperacaofiscal?: string | undefined;

	gerarCustos?: boolean | undefined;

	gerarFinanceiro?: boolean | undefined;
};

type ImportarXmlNfResposta = {
	idRascunho: string;

	nota: NotaFiscal;

	itens: NotaFiscalItem[];

	mensagem: string;
};

export async function importarXmlNfService({
	idusuario,

	idempresa,

	xml,

	idplanocontas,

	idcondicaopagto,

	idtipodocumento,

	idoperacaofiscal,
}: ImportarXmlNfParametros): Promise<HttpResponse<ImportarXmlNfResposta>> {
	try {
		parseNFeXml(xml);
	} catch (erro) {
		return httpBadRequest(
			`Falha ao processar o XML: ${erro instanceof Error ? erro.message : "XML inválido"}`,
		);
	}

	const resultado = await criarRascunhoImportacaoNfService({
		idusuario,

		idempresa,

		xml,

		idplanocontas,

		idcondicaopagto,

		idtipodocumento,

		idoperacaofiscal,
	});

	if (!resultado.success || !resultado.body) {
		return resultado as HttpResponse<ImportarXmlNfResposta>;
	}

	return {
		success: true,

		status: resultado.status,

		body: {
			idRascunho: resultado.body.idRascunho,

			nota: resultado.body.nota,

			itens: resultado.body.itens,

			mensagem:
				"Rascunho criado. Revise os itens e finalize a importação em /notas-fiscais/rascunhos/{id}.",
		},
	};
}
