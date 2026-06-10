import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarTipoProblemaPorId,
	excluirTipoProblema,
} from "@/repositories/tipo-problema-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirTipoProblemaParametros = {
	tipoProblemaId: string;
	idusuario: string;
};

export async function excluirTipoProblemaService({
	tipoProblemaId,
	idusuario,
}: ExcluirTipoProblemaParametros): Promise<HttpResponse<null>> {
	const registro = await buscarTipoProblemaPorId(tipoProblemaId);

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
		acao: "excluir_tipo_problema",
		idusuario,
		recurso: "tipo_problema",
		idrecurso: tipoProblemaId,
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

	await excluirTipoProblema(tipoProblemaId);

	return httpSemConteudo();
}
