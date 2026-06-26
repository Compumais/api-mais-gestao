import type { HttpResponse } from "@/model/http-model.js";
import type { EmpresaNfeSync } from "@/model/nfe-inbound-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarNfeInboundDocumentos,
	obterOuCriarEmpresaNfeSync,
} from "@/repositories/nfe-inbound-repositories.js";
import type { StatusImportacaoInbound } from "@/model/nfe-inbound-model.js";
import type { StatusManifestacaoInbound } from "@/model/nfe-inbound-model.js";
import {
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	obterIdUsuarioAutoImport,
	sincronizarEmpresaNfeInboundService,
} from "./nfe-inbound-sync.service.js";

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

	return httpOk({
		data: documentos,
		paginacao: {
			page: page ?? 1,
			limit: limit ?? 20,
			total,
			totalPages: Math.ceil(total / (limit ?? 20)),
		},
	});
}
