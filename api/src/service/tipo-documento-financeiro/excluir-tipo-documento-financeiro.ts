import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarTipoDocumentoFinanceiroPorId,
	excluirTipoDocumentoFinanceiro,
} from "@/repositories/tipo-documento-financeiro-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirTipoDocumentoFinanceiroParametros = {
	tipoDocumentoFinanceiroId: string;
	idusuario: string;
};

export async function excluirTipoDocumentoFinanceiroService({
	tipoDocumentoFinanceiroId,
	idusuario,
}: ExcluirTipoDocumentoFinanceiroParametros): Promise<HttpResponse<null>> {
	const registro = await buscarTipoDocumentoFinanceiroPorId(
		tipoDocumentoFinanceiroId,
	);

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
		acao: "excluir_tipo_documento_financeiro",
		idusuario,
		recurso: "tipo_documento_financeiro",
		idrecurso: tipoDocumentoFinanceiroId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirTipoDocumentoFinanceiro(tipoDocumentoFinanceiroId);

	return httpSemConteudo();
}
