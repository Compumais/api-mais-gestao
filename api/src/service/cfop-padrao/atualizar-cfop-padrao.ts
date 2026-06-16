import { v4 as uuidv4 } from "uuid";
import type { CFOPPadrao, NovoCFOPPadrao } from "@/model/cfop-padrao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCfopPadrao,
	buscarCfopPadraoPorId,
} from "@/repositories/cfop-padrao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import type { AtualizacaoParcial } from "@/util/type-util.js";

type AtualizarCfopPadraoParametros = {
	cfopPadraoId: string;
	idusuario: string;
	dados: AtualizacaoParcial<NovoCFOPPadrao>;
};

export async function atualizarCfopPadraoService({
	cfopPadraoId,
	idusuario,
	dados,
}: AtualizarCfopPadraoParametros): Promise<HttpResponse<CFOPPadrao | null>> {
	const registroExistente = await buscarCfopPadraoPorId(cfopPadraoId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarCfopPadrao(cfopPadraoId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_cfop_padrao",
		idusuario,
		recurso: "cfop_padrao",
		idrecurso: cfopPadraoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<CFOPPadrao>(registroAtualizado);
}
