import { v4 as uuidv4 } from "uuid";
import type { Hierarquia, NovoHierarquia } from "@/model/hierarquia-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarHierarquia,
	excluirHierarquia,
} from "@/repositories/hierarquia-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarHierarquiaParametros = {
	dadosHierarquia: NovoHierarquia;
	idusuario: string;
};

export async function criarHierarquiaService({
	dadosHierarquia,
	idusuario,
}: CriarHierarquiaParametros): Promise<HttpResponse<Hierarquia | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosHierarquia.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarHierarquia(dadosHierarquia);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_hierarquia",
		idusuario,
		recurso: "hierarquia",
		idrecurso: registro.id,
		idempresa: dadosHierarquia.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirHierarquia(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<Hierarquia>(registro);
}
