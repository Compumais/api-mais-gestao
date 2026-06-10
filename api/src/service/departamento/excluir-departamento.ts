import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarDepartamentoPorId,
	excluirDepartamento,
} from "@/repositories/departamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirDepartamentoParametros = {
	departamentoId: string;
	idusuario: string;
};

export async function excluirDepartamentoService({
	departamentoId,
	idusuario,
}: ExcluirDepartamentoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarDepartamentoPorId(departamentoId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_departamento",
		idusuario,
		recurso: "departamento",
		idrecurso: departamentoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirDepartamento(departamentoId);

	return httpSemConteudo();
}
