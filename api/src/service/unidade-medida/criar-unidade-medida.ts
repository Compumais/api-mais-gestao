import { v4 as uuidv4 } from "uuid";
import type {
	UnidadeMedida,
	NovoUnidadeMedida,
} from "@/model/unidade-medida-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarUnidadeMedida,
	excluirUnidadeMedida,
} from "@/repositories/unidade-medida-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarUnidadeMedidaParametros = {
	dadosUnidadeMedida: NovoUnidadeMedida;
	idusuario: string;
};

export async function criarUnidadeMedidaService({
	dadosUnidadeMedida,
	idusuario,
}: CriarUnidadeMedidaParametros): Promise<HttpResponse<UnidadeMedida | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosUnidadeMedida.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarUnidadeMedida(dadosUnidadeMedida);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_unidade_medida",
		idusuario,
		recurso: "unidade_medida",
		idrecurso: registro.id,
		idempresa: dadosUnidadeMedida.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirUnidadeMedida(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<UnidadeMedida>(registro);
}
