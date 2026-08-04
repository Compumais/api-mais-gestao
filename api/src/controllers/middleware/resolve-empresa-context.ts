import type { FastifyReply, FastifyRequest } from "fastify";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";
import { isSuper } from "@/util/verificar-super.js";

export const HEADER_EMPRESA_ID = "x-empresa-id";

export type EmpresaContext = {
	idempresa: string;
	idproprietario: string;
};

function extrairIdEmpresaDoRequest(
	request: FastifyRequest,
): string | undefined {
	const header = request.headers[HEADER_EMPRESA_ID];
	const deHeader = Array.isArray(header) ? header[0] : header;

	const params = request.params as Record<string, string> | undefined;
	const body = request.body as Record<string, unknown> | undefined;
	const query = request.query as Record<string, string> | undefined;

	const deParams = params?.idempresa;
	const deBody =
		typeof body?.idempresa === "string" ? body.idempresa : undefined;
	const deQuery = query?.idempresa;

	return deHeader || deParams || deBody || deQuery || undefined;
}

/**
 * Resolve e valida o contexto da empresa a partir do header/query/body/params.
 * Deve rodar após a autenticação (quando request.user já existe).
 */
export async function resolveEmpresaContext(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return;
	}

	if (isSuper(normalizarPerfilArray(request.user.roles))) {
		return;
	}

	const idempresa = extrairIdEmpresaDoRequest(request);
	if (!idempresa) {
		return;
	}

	const pertence = await verificarUsuarioPertenceEmpresa(
		request.user.id,
		idempresa,
	);
	if (!pertence) {
		return reply.status(403).send({
			error: "Usuário não pertence à empresa informada",
			code: "EMPRESA_ACESSO_NEGADO",
		});
	}

	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa?.idproprietario) {
		return reply.status(404).send({
			error: "Empresa não encontrada",
			code: "EMPRESA_NAO_ENCONTRADA",
		});
	}

	request.empresaContext = {
		idempresa,
		idproprietario: empresa.idproprietario,
	};
}

export function obterIdEmpresaDoContexto(
	request: FastifyRequest,
): string | undefined {
	return (
		request.empresaContext?.idempresa ?? extrairIdEmpresaDoRequest(request)
	);
}
