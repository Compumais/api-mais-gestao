import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarPermissao } from "../../util/verificar-permissao.js";

const PREFIXOS_PUBLICOS = ["/health", "/docs", "/api/auth"];

type RotaGarcom = {
	metodo?: string;
	padrao: RegExp;
};

const ROTAS_GARCOM: RotaGarcom[] = [
	{ metodo: "GET", padrao: /^\/empresas(\/[^/]+)?$/ },
	{ metodo: "GET", padrao: /^\/produtos(\/[^/]+)?$/ },
	{ metodo: "GET", padrao: /^\/hierarquias(\/[^/]+)?$/ },
	{ padrao: /^\/saldos-estoque(\/[^/]+)?$/ },
	{ padrao: /^\/movimentos-estoque(\/[^/]+)?$/ },
	{ padrao: /^\/contas-mesa(\/[^/]+)?$/ },
	{ padrao: /^\/contas-mesa-item(\/[^/]+)?$/ },
	{ padrao: /^\/vendas-pdv-gourmet(\/[^/]+)?$/ },
	{ padrao: /^\/vendas-pdv-item(\/[^/]+)?$/ },
	{ padrao: /^\/fechamentos-caixa(\/[^/]+)?$/ },
	{ metodo: "GET", padrao: /^\/usuarios(\/[^/]+)?$/ },
];

function extrairPath(url: string): string {
	return url.split("?")[0] ?? url;
}

function rotaPermitidaParaGarcom(metodo: string, path: string): boolean {
	return ROTAS_GARCOM.some((rota) => {
		if (rota.metodo && rota.metodo !== metodo) return false;
		return rota.padrao.test(path);
	});
}

export async function verificarAcessoGarcom(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const path = extrairPath(request.url);

	if (PREFIXOS_PUBLICOS.some((prefixo) => path.startsWith(prefixo))) {
		return;
	}

	if (!request.user) {
		return;
	}

	const roles = request.user.roles;
	if (!verificarPermissao(roles, ["garcom"])) {
		return;
	}

	const metodo = request.method.toUpperCase();
	if (rotaPermitidaParaGarcom(metodo, path)) {
		return;
	}

	return reply.status(403).send({
		error: "Acesso negado para perfil garçom",
		code: "FORBIDDEN",
	});
}
