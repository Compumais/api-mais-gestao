import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarOperacaoFiscalPorId,
	excluirOperacaoFiscal,
} from "@/repositories/operacao-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirOperacaoFiscalParametros = {
	operacaoFiscalId: string;
	idusuario: string;
};

export async function excluirOperacaoFiscalService({
	operacaoFiscalId,
	idusuario,
}: ExcluirOperacaoFiscalParametros): Promise<HttpResponse<null>> {
	const registro = await buscarOperacaoFiscalPorId(operacaoFiscalId);

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
		acao: "excluir_operacao_fiscal",
		idusuario,
		recurso: "operacao_fiscal",
		idrecurso: operacaoFiscalId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirOperacaoFiscal(operacaoFiscalId);

	return httpSemConteudo();
}
