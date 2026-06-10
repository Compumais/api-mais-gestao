import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarHierarquiaPorId,
	excluirHierarquia,
} from "@/repositories/hierarquia-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirHierarquiaParametros = {
	hierarquiaId: string;
	idusuario: string;
};

export async function excluirHierarquiaService({
	hierarquiaId,
	idusuario,
}: ExcluirHierarquiaParametros): Promise<HttpResponse<null>> {
	const registro = await buscarHierarquiaPorId(hierarquiaId);

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
		acao: "excluir_hierarquia",
		idusuario,
		recurso: "hierarquia",
		idrecurso: hierarquiaId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirHierarquia(hierarquiaId);

	return httpSemConteudo();
}
