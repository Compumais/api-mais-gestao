import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarTipoContratoPorId,
	excluirTipoContrato,
} from "@/repositories/tipo-contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirTipoContratoParametros = {
	tipoContratoId: string;
	idusuario: string;
};

export async function excluirTipoContratoService({
	tipoContratoId,
	idusuario,
}: ExcluirTipoContratoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarTipoContratoPorId(tipoContratoId);

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
		acao: "excluir_tipo_contrato",
		idusuario,
		recurso: "tipo_contrato",
		idrecurso: tipoContratoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
			descricao: registro.descricao,
			valor: registro.valor,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirTipoContrato(tipoContratoId);

	return httpSemConteudo();
}
