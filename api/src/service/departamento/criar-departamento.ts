import { v4 as uuidv4 } from "uuid";
import type {
	Departamento,
	NovoDepartamento,
} from "@/model/departamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarDepartamento,
	excluirDepartamento,
} from "@/repositories/departamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarDepartamentoParametros = {
	dadosDepartamento: NovoDepartamento;
	idusuario: string;
};

export async function criarDepartamentoService({
	dadosDepartamento,
	idusuario,
}: CriarDepartamentoParametros): Promise<HttpResponse<Departamento | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosDepartamento.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarDepartamento(dadosDepartamento);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_departamento",
		idusuario,
		recurso: "departamento",
		idrecurso: registro.id,
		idempresa: dadosDepartamento.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirDepartamento(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<Departamento>(registro);
}
