import type { HttpResponse } from "@/model/http-model.js";
import { buscarNotaFiscalPorChaveNfe } from "@/repositories/nota-fiscal-repositories.js";
import {
	atualizarNfeInboundDocumento,
	buscarNfeInboundDocumentoPorId,
} from "@/repositories/nfe-inbound-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarRascunhoImportacaoNfService } from "@/service/nota-fiscal/importacao/criar-rascunho-importacao-nf.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type ImportPurchaseInvoiceParametros = {
	idDocumento: string;
	idempresa: string;
	idusuario: string;
};

export type ImportPurchaseInvoiceResposta = {
	idRascunho: string;
	urlRascunho: string;
};

export async function importPurchaseInvoiceService({
	idDocumento,
	idempresa,
	idusuario,
}: ImportPurchaseInvoiceParametros): Promise<
	HttpResponse<ImportPurchaseInvoiceResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const documento = await buscarNfeInboundDocumentoPorId(idDocumento);

	if (!documento || documento.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (documento.tipodocumento !== "procNFe") {
		return httpBadRequest(
			"Somente notas com XML completo (procNFe) podem ser importadas. Manifeste ciência e sincronize novamente se necessário.",
		);
	}

	if (!documento.xml) {
		return httpBadRequest("Documento sem XML armazenado");
	}

	if (documento.idrascunho) {
		return httpOk({
			idRascunho: documento.idrascunho,
			urlRascunho: `/nota-fiscal-compra/rascunho/${documento.idrascunho}`,
		});
	}

	const notaExistente = await buscarNotaFiscalPorChaveNfe(
		idempresa,
		documento.chavenfe,
	);

	if (notaExistente && notaExistente.status !== 99) {
		return httpBadRequest("Esta NF-e já foi importada no sistema");
	}

	const resultadoRascunho = await criarRascunhoImportacaoNfService({
		idusuario,
		idempresa,
		xml: documento.xml,
	});

	if (!resultadoRascunho.success || !resultadoRascunho.body) {
		if (!resultadoRascunho.success) {
			return resultadoRascunho as HttpResponse<ImportPurchaseInvoiceResposta>;
		}
		return httpErroInterno() as HttpResponse<ImportPurchaseInvoiceResposta>;
	}

	const idRascunho = resultadoRascunho.body.idRascunho;
	const agora = new Date().toISOString();

	await atualizarNfeInboundDocumento(documento.id, {
		statusimportacao: "rascunho_criado",
		idrascunho: idRascunho,
		atualizadoem: agora,
	});

	return httpOk({
		idRascunho,
		urlRascunho: `/nota-fiscal-compra/rascunho/${idRascunho}`,
	});
}
