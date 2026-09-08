import { v4 as uuidv4 } from "uuid";
import type { CFOP, NovoCFOP } from "@/model/cfop-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCfop,
	buscarCfopPorId,
} from "@/repositories/cfop-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { validarRelacionamentosCfop } from "@/service/cfop/validar-relacionamentos-cfop.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarCfopParametros = {
	cfopId: string;
	idusuario: string;
	dados: Partial<NovoCFOP>;
};

export async function atualizarCfopService({
	cfopId,
	idusuario,
	dados,
}: AtualizarCfopParametros): Promise<HttpResponse<CFOP | null>> {
	const registroExistente = await buscarCfopPorId(cfopId);

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

	const {
		id: _idIgnorado,
		idempresa: _empresaIgnorada,
		...dadosSeguros
	} = dados as Partial<NovoCFOP> & { id?: string; idempresa?: string };

	const erroRelacionamento = await validarRelacionamentosCfop({
		idempresa: registroExistente.idempresa,
		cfopIdAtual: cfopId,
		relacionamentos: {
			idplanocontas: dadosSeguros.idplanocontas,
			idtipodocumentofinanceiro: dadosSeguros.idtipodocumentofinanceiro,
			idnaturezaoperacaoinversa: dadosSeguros.idnaturezaoperacaoinversa,
			idnaturezanaocontribuinte: dadosSeguros.idnaturezanaocontribuinte,
			idnaturezadevolucao: dadosSeguros.idnaturezadevolucao,
		},
	});

	if (erroRelacionamento) {
		return erroRelacionamento as HttpResponse<CFOP | null>;
	}

	const registroAtualizado = await atualizarCfop(cfopId, {
		...dadosSeguros,
		currenttimemillis: Date.now(),
	});

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_cfop",
		idusuario,
		recurso: "cfop",
		idrecurso: cfopId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dadosSeguros),
			valores: dadosSeguros,
		},
	});

	return httpOk<CFOP>(registroAtualizado);
}
