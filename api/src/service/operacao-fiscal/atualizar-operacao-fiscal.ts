import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoOperacaoFiscal,
	OperacaoFiscal,
} from "@/model/operacao-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarOperacaoFiscal,
	buscarOperacaoFiscalPorId,
} from "@/repositories/operacao-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarOperacaoFiscalParametros = {
	operacaoFiscalId: string;
	idusuario: string;
	dados: Partial<NovoOperacaoFiscal>;
};

export async function atualizarOperacaoFiscalService({
	operacaoFiscalId,
	idusuario,
	dados,
}: AtualizarOperacaoFiscalParametros): Promise<
	HttpResponse<OperacaoFiscal | null>
> {
	const registroExistente = await buscarOperacaoFiscalPorId(operacaoFiscalId);

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

	const registroAtualizado = await atualizarOperacaoFiscal(
		operacaoFiscalId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_operacao_fiscal",
		idusuario,
		recurso: "operacao_fiscal",
		idrecurso: operacaoFiscalId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<OperacaoFiscal>(registroAtualizado);
}
