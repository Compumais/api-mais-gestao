import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	type ApuracaoEfdAjuste,
	criarAjusteApuracaoEfd,
	excluirAjusteApuracaoEfd,
	listarAjustesApuracaoEfdCompleto,
} from "@/repositories/apuracao-efd-ajuste-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ListarParams = {
	idusuario: string;
	idempresa: string;
	competencia?: string;
};

export async function listarAjustesApuracaoEfdService({
	idusuario,
	idempresa,
	competencia,
}: ListarParams): Promise<HttpResponse<ApuracaoEfdAjuste[]>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();
	const ajustes = await listarAjustesApuracaoEfdCompleto(
		idempresa,
		competencia,
	);
	return httpOk(ajustes);
}

export async function criarAjusteApuracaoEfdService(params: {
	idusuario: string;
	idempresa: string;
	tipo: "icms" | "pis" | "cofins";
	competencia: string;
	codigoajuste: string;
	descricao?: string | null;
	valor: string;
	natureza: "debito" | "credito";
}): Promise<HttpResponse<ApuracaoEfdAjuste | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!pertence) return httpProibido();

	if (!/^\d{4}-\d{2}-\d{2}$/.test(params.competencia)) {
		return httpBadRequest("Competência deve ser YYYY-MM-DD (dia 01 do mês).");
	}

	const agora = new Date().toISOString();
	const registro = await criarAjusteApuracaoEfd({
		id: uuidv4(),
		idempresa: params.idempresa,
		tipo: params.tipo,
		competencia: `${params.competencia.slice(0, 7)}-01`,
		codigoajuste: params.codigoajuste,
		descricao: params.descricao ?? null,
		valor: params.valor,
		natureza: params.natureza,
		criadoem: agora,
		atualizadoem: agora,
	});
	return httpCriacao(registro ?? null);
}

export async function excluirAjusteApuracaoEfdService(params: {
	idusuario: string;
	idempresa: string;
	id: string;
}) {
	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!pertence) return httpProibido();

	const excluido = await excluirAjusteApuracaoEfd(params.id, params.idempresa);
	if (!excluido) return httpNaoEncontrado();
	return httpSemConteudo();
}
