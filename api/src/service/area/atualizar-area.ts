import { v4 as uuidv4 } from "uuid";
import type { Area, NovoArea } from "@/model/area-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarArea,
	buscarAreaPorId,
} from "@/repositories/area-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarAreaParametros = {
	areaId: string;
	idusuario: string;
	dados: Partial<NovoArea>;
};

export async function atualizarAreaService({
	areaId,
	idusuario,
	dados,
}: AtualizarAreaParametros): Promise<HttpResponse<Area | null>> {
	const registroExistente = await buscarAreaPorId(areaId);

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

	const registroAtualizado = await atualizarArea(areaId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_area",
		idusuario,
		recurso: "area",
		idrecurso: areaId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<Area>(registroAtualizado);
}
