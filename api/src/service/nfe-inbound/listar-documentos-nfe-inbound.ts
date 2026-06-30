import type { HttpResponse } from "@/model/http-model.js";
import type {
	EmpresaNfeSync,
	NfeInboundDocumentoListagem,
	StatusImportacaoInbound,
	StatusManifestacaoInbound,
	TipoDocumentoInbound,
} from "@/model/nfe-inbound-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarNfeInboundDocumentos,
	obterOuCriarEmpresaNfeSync,
	atualizarNfeInboundDocumento,
} from "@/repositories/nfe-inbound-repositories.js";
import { buscarNotasFiscaisPorChavesNfe } from "@/repositories/nota-fiscal-repositories.js";
import {
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	obterIdUsuarioAutoImport,
	sincronizarEmpresaNfeInboundService,
} from "./nfe-inbound-sync.service.js";

async function enriquecerDocumentosInbound(
	idempresa: string,
	documentos: Awaited<
		ReturnType<typeof listarNfeInboundDocumentos>
	>["documentos"],
): Promise<NfeInboundDocumentoListagem[]> {
	const chaves = documentos.map((documento) => documento.chavenfe);
	const notasPorChave = await buscarNotasFiscaisPorChavesNfe(idempresa, chaves);
	const agora = new Date().toISOString();

	return Promise.all(
		documentos.map(async (documento) => {
			const notaImportada = notasPorChave.get(documento.chavenfe);
			const jaImportada = Boolean(notaImportada);
			let statusimportacao =
				documento.statusimportacao as StatusImportacaoInbound;

			if (
				jaImportada &&
				statusimportacao !== "importado" &&
				statusimportacao !== "rascunho_criado"
			) {
				await atualizarNfeInboundDocumento(documento.id, {
					statusimportacao: "importado",
					atualizadoem: agora,
				});
				statusimportacao = "importado";
			}

			const { xml: _xml, ...documentoSemXml } = documento;

			return {
				...documentoSemXml,
				tipodocumento: documento.tipodocumento as TipoDocumentoInbound,
				statusmanifestacao:
					documento.statusmanifestacao as StatusManifestacaoInbound,
				statusimportacao,
				jaImportada,
				idnotafiscal: notaImportada?.id ?? null,
			};
		}),
	);
}

export async function obterStatusSyncNfeInboundService({
	idempresa,
	idusuario,
}: {
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<EmpresaNfeSync>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const sync = await obterOuCriarEmpresaNfeSync(idempresa);

	return httpOk({
		idempresa: sync.idempresa,
		ultimonsu: sync.ultimonsu,
		maxnsu: sync.maxnsu,
		ultimosync: sync.ultimosync,
		proximotentativa: sync.proximotentativa,
		sincronizando: sync.sincronizando,
		importacaoautomatica: sync.importacaoautomatica,
		tentativasbackoff: sync.tentativasbackoff,
	});
}

export async function sincronizarNfeInboundService({
	idempresa,
	idusuario,
}: {
	idempresa: string;
	idusuario: string;
}) {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const sync = await obterOuCriarEmpresaNfeSync(idempresa);
	const idusuarioAutoImport = sync.importacaoautomatica
		? idusuario
		: await obterIdUsuarioAutoImport(idempresa);

	const resultado = await sincronizarEmpresaNfeInboundService({
		idempresa,
		...(idusuarioAutoImport && { idusuarioAutoImport }),
	});

	return httpOk(resultado);
}

export async function listarDocumentosNfeInboundService({
	idempresa,
	idusuario,
	statusimportacao,
	statusmanifestacao,
	page,
	limit,
}: {
	idempresa: string;
	idusuario: string;
	statusimportacao?: StatusImportacaoInbound;
	statusmanifestacao?: StatusManifestacaoInbound;
	page?: number;
	limit?: number;
}) {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const { documentos, total } = await listarNfeInboundDocumentos({
		idempresa,
		...(statusimportacao && { statusimportacao }),
		...(statusmanifestacao && { statusmanifestacao }),
		page,
		limit,
	});

	const data = await enriquecerDocumentosInbound(idempresa, documentos);

	return httpOk({
		data,
		paginacao: {
			page: page ?? 1,
			limit: limit ?? 20,
			total,
			totalPages: Math.ceil(total / (limit ?? 20)),
		},
	});
}
