import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarContaMesaPorId,
	excluirContaMesa,
} from "@/repositories/conta-mesa-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirContaMesaParametros = {
	contaMesaId: string;
	idusuario: string;
};

export async function excluirContaMesaService({
	contaMesaId,
	idusuario,
}: ExcluirContaMesaParametros): Promise<HttpResponse<null>> {
	const registro = await buscarContaMesaPorId(contaMesaId);

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
		acao: "excluir_conta_mesa",
		idusuario,
		recurso: "conta_mesa",
		idrecurso: contaMesaId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numeromesa: registro.numeromesa,
			status: registro.status,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirContaMesa(contaMesaId);

	return httpSemConteudo();
}
