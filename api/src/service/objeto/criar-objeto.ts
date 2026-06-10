import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoObjeto, Objeto } from "@/model/objeto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarObjeto,
	excluirObjeto,
} from "@/repositories/objeto-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarObjetoParametros = {
	dadosObjeto: NovoObjeto;
	idusuario: string;
};

export async function criarObjetoService({
	dadosObjeto,
	idusuario,
}: CriarObjetoParametros): Promise<HttpResponse<Objeto | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosObjeto.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarObjeto(dadosObjeto);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_objeto",
		idusuario,
		recurso: "objeto",
		idrecurso: registro.id,
		idempresa: dadosObjeto.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirObjeto(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<Objeto>(registro);
}
