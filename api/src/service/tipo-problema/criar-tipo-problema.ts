import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoTipoProblema,
	TipoProblema,
} from "@/model/tipo-problema-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarTipoProblema,
	excluirTipoProblema,
} from "@/repositories/tipo-problema-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarTipoProblemaParametros = {
	dadosTipoProblema: NovoTipoProblema;
	idusuario: string;
};

export async function criarTipoProblemaService({
	dadosTipoProblema,
	idusuario,
}: CriarTipoProblemaParametros): Promise<HttpResponse<TipoProblema | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosTipoProblema.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarTipoProblema(dadosTipoProblema);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_tipo_problema",
		idusuario,
		recurso: "tipo_problema",
		idrecurso: registro.id,
		idempresa: dadosTipoProblema.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirTipoProblema(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<TipoProblema>(registro);
}
