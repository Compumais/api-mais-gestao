import { v4 as uuidv4 } from "uuid";
import type { ContaMesa, NovaContaMesa } from "@/model/conta-mesa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarContaMesa,
	buscarContaMesaPorId,
} from "@/repositories/conta-mesa-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarContaMesaParametros = {
	contaMesaId: string;
	idusuario: string;
	dados: Partial<NovaContaMesa>;
};

export async function atualizarContaMesaService({
	contaMesaId,
	idusuario,
	dados,
}: AtualizarContaMesaParametros): Promise<HttpResponse<ContaMesa | null>> {
	const registroExistente = await buscarContaMesaPorId(contaMesaId);

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

	const registroAtualizado = await atualizarContaMesa(contaMesaId, {
		...dados,
		dataalteracao: new Date().toISOString(),
	});

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_conta_mesa",
		idusuario,
		recurso: "conta_mesa",
		idrecurso: contaMesaId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<ContaMesa>(registroAtualizado);
}
