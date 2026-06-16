import { v4 as uuidv4 } from "uuid";
import type {
	Departamento,
	NovoDepartamento,
} from "@/model/departamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarDepartamento,
	buscarDepartamentoPorId,
} from "@/repositories/departamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import type { AtualizacaoParcial } from "@/util/type-util.js";

type AtualizarDepartamentoParametros = {
	departamentoId: string;
	idusuario: string;
	dados: AtualizacaoParcial<NovoDepartamento>;
};

export async function atualizarDepartamentoService({
	departamentoId,
	idusuario,
	dados,
}: AtualizarDepartamentoParametros): Promise<
	HttpResponse<Departamento | null>
> {
	const registroExistente = await buscarDepartamentoPorId(departamentoId);

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

	const registroAtualizado = await atualizarDepartamento(departamentoId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_departamento",
		idusuario,
		recurso: "departamento",
		idrecurso: departamentoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<Departamento>(registroAtualizado);
}
