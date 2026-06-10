import { v4 as uuidv4 } from "uuid";
import type { CFOPPadrao, NovoCFOPPadrao } from "@/model/cfop-padrao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarCfopPadrao,
	excluirCfopPadrao,
} from "@/repositories/cfop-padrao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarCfopPadraoParametros = {
	dadosCfopPadrao: NovoCFOPPadrao;
	idusuario: string;
};

export async function criarCfopPadraoService({
	dadosCfopPadrao,
	idusuario,
}: CriarCfopPadraoParametros): Promise<HttpResponse<CFOPPadrao | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosCfopPadrao.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarCfopPadrao(dadosCfopPadrao);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_cfop_padrao",
		idusuario,
		recurso: "cfop_padrao",
		idrecurso: registro.id,
		idempresa: dadosCfopPadrao.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			codigo: registro.codigo,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirCfopPadrao(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<CFOPPadrao>(registro);
}
