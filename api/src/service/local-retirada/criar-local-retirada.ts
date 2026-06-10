import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	LocalRetirada,
	NovoLocalRetirada,
} from "@/model/local-retirada-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarLocalRetirada,
	excluirLocalRetirada,
} from "@/repositories/local-retirada-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarLocalRetiradaParametros = {
	dadosLocalRetirada: NovoLocalRetirada;
	idusuario: string;
};

export async function criarLocalRetiradaService({
	dadosLocalRetirada,
	idusuario,
}: CriarLocalRetiradaParametros): Promise<HttpResponse<LocalRetirada | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosLocalRetirada.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarLocalRetirada(dadosLocalRetirada);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_local_retirada",
		idusuario,
		recurso: "local_retirada",
		idrecurso: registro.id,
		idempresa: dadosLocalRetirada.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirLocalRetirada(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<LocalRetirada>(registro);
}
