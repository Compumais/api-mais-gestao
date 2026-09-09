import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoTipoCobranca,
	TipoCobranca,
} from "@/model/tipo-cobranca-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarTipoCobranca,
	buscarTipoCobrancaPorId,
} from "@/repositories/tipo-cobranca-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import { validarTipoDocumentoFinanceiroTipoCobranca } from "./validar-tipo-documento-financeiro.js";

type DadosAtualizarTipoCobranca = Partial<
	Pick<NovoTipoCobranca, "codigo" | "descricao" | "idtipodocumentofinanceiro">
>;

type AtualizarTipoCobrancaParametros = {
	tipoCobrancaId: string;
	idusuario: string;
	dados: DadosAtualizarTipoCobranca;
};

export async function atualizarTipoCobrancaService({
	tipoCobrancaId,
	idusuario,
	dados,
}: AtualizarTipoCobrancaParametros): Promise<
	HttpResponse<TipoCobranca | null>
> {
	const registroExistente = await buscarTipoCobrancaPorId(tipoCobrancaId);

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

	if (dados.idtipodocumentofinanceiro) {
		const erroRelacionamento = await validarTipoDocumentoFinanceiroTipoCobranca(
			dados.idtipodocumentofinanceiro,
			registroExistente.idempresa,
		);

		if (erroRelacionamento) {
			return erroRelacionamento;
		}
	}

	const registroAtualizado = await atualizarTipoCobranca(tipoCobrancaId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_tipo_cobranca",
		idusuario,
		recurso: "tipo_cobranca",
		idrecurso: tipoCobrancaId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk(registroAtualizado);
}
