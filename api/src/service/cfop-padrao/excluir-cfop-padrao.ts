import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCfopPadraoPorId,
	excluirCfopPadrao,
} from "@/repositories/cfop-padrao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirCfopPadraoParametros = {
	cfopPadraoId: string;
	idusuario: string;
};

export async function excluirCfopPadraoService({
	cfopPadraoId,
	idusuario,
}: ExcluirCfopPadraoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarCfopPadraoPorId(cfopPadraoId);

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
		acao: "excluir_cfop_padrao",
		idusuario,
		recurso: "cfop_padrao",
		idrecurso: cfopPadraoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			codigo: registro.codigo,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirCfopPadrao(cfopPadraoId);

	return httpSemConteudo();
}
