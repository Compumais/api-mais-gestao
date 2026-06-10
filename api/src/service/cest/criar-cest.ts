import { v4 as uuidv4 } from "uuid";
import type { CEST, NovoCEST } from "@/model/cest-mode.js";
import type { HttpResponse } from "@/model/http-model.js";
import { criarCest, excluirCest } from "@/repositories/cest-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarCestParametros = {
	dadosCest: NovoCEST;
	idusuario: string;
};

export async function criarCestService({
	dadosCest,
	idusuario,
}: CriarCestParametros): Promise<HttpResponse<CEST | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosCest.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarCest(dadosCest);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_cest",
		idusuario,
		recurso: "cest",
		idrecurso: registro.id,
		idempresa: dadosCest.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirCest(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<CEST>(registro);
}
