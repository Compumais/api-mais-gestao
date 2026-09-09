import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoTipoCobranca,
	TipoCobranca,
} from "@/model/tipo-cobranca-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarTipoCobranca,
	excluirTipoCobranca,
} from "@/repositories/tipo-cobranca-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import { validarTipoDocumentoFinanceiroTipoCobranca } from "./validar-tipo-documento-financeiro.js";

type CriarTipoCobrancaParametros = {
	dadosTipoCobranca: NovoTipoCobranca;
	idusuario: string;
};

export async function criarTipoCobrancaService({
	dadosTipoCobranca,
	idusuario,
}: CriarTipoCobrancaParametros): Promise<HttpResponse<TipoCobranca | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosTipoCobranca.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const erroRelacionamento = await validarTipoDocumentoFinanceiroTipoCobranca(
		dadosTipoCobranca.idtipodocumentofinanceiro,
		dadosTipoCobranca.idempresa,
	);

	if (erroRelacionamento) {
		return erroRelacionamento;
	}

	const registro = await criarTipoCobranca(dadosTipoCobranca);

	if (!registro) {
		return httpErro();
	}

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_tipo_cobranca",
		idusuario,
		recurso: "tipo_cobranca",
		idrecurso: registro.id,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
			descricao: registro.descricao,
			idtipodocumentofinanceiro: registro.idtipodocumentofinanceiro,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirTipoCobranca(registro.id);
		return httpErroInterno();
	}

	return httpCriacao(registro);
}
