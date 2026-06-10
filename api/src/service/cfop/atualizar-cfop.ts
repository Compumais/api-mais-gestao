import { v4 as uuidv4 } from "uuid";
import type { CFOP, NovoCFOP } from "@/model/cfop-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCfop,
	buscarCfopPorId,
} from "@/repositories/cfop-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarCfopParametros = {
	cfopId: string;
	idusuario: string;
	dados: Partial<NovoCFOP>;
};

export async function atualizarCfopService({
	cfopId,
	idusuario,
	dados,
}: AtualizarCfopParametros): Promise<HttpResponse<CFOP | null>> {
	const registroExistente = await buscarCfopPorId(cfopId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarCfop(cfopId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_cfop",
		idusuario,
		recurso: "cfop",
		idrecurso: cfopId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<CFOP>(registroAtualizado);
}
