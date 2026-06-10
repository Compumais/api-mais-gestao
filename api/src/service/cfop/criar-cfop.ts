import { v4 as uuidv4 } from "uuid";
import type { CFOP, NovoCFOP } from "@/model/cfop-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { criarCfop, excluirCfop } from "@/repositories/cfop-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarCfopParametros = {
	dadosCfop: NovoCFOP;
	idusuario: string;
};

export async function criarCfopService({
	dadosCfop,
	idusuario,
}: CriarCfopParametros): Promise<HttpResponse<CFOP | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosCfop.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarCfop(dadosCfop);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_cfop",
		idusuario,
		recurso: "cfop",
		idrecurso: registro.id,
		idempresa: dadosCfop.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirCfop(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<CFOP>(registro);
}
