import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarTipoCobrancaPorId,
	excluirTipoCobranca,
} from "@/repositories/tipo-cobranca-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirTipoCobrancaParametros = {
	tipoCobrancaId: string;
	idusuario: string;
};

export async function excluirTipoCobrancaService({
	tipoCobrancaId,
	idusuario,
}: ExcluirTipoCobrancaParametros): Promise<HttpResponse<null>> {
	const registro = await buscarTipoCobrancaPorId(tipoCobrancaId);

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

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_tipo_cobranca",
		idusuario,
		recurso: "tipo_cobranca",
		idrecurso: tipoCobrancaId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
			descricao: registro.descricao,
			idtipodocumentofinanceiro: registro.idtipodocumentofinanceiro,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirTipoCobranca(tipoCobrancaId);

	return httpSemConteudo();
}
