import { v4 as uuidv4 } from "uuid";
import type {
	TipoDocumentoFinanceiro,
	NovoTipoDocumentoFinanceiro,
} from "@/model/tipo-documento-financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarTipoDocumentoFinanceiroPorId,
	atualizarTipoDocumentoFinanceiro,
} from "@/repositories/tipo-documento-financeiro-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import type { AtualizacaoParcial } from "@/util/type-util.js";

type AtualizarTipoDocumentoFinanceiroParametros = {
	tipoDocumentoFinanceiroId: string;
	idusuario: string;
	dados: AtualizacaoParcial<NovoTipoDocumentoFinanceiro>;
};

export async function atualizarTipoDocumentoFinanceiroService({
	tipoDocumentoFinanceiroId,
	idusuario,
	dados,
}: AtualizarTipoDocumentoFinanceiroParametros): Promise<
	HttpResponse<TipoDocumentoFinanceiro | null>
> {
	const registroExistente = await buscarTipoDocumentoFinanceiroPorId(
		tipoDocumentoFinanceiroId,
	);

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

	const registroAtualizado = await atualizarTipoDocumentoFinanceiro(
		tipoDocumentoFinanceiroId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_tipo_documento_financeiro",
		idusuario,
		recurso: "tipo_documento_financeiro",
		idrecurso: tipoDocumentoFinanceiroId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<TipoDocumentoFinanceiro>(registroAtualizado);
}
