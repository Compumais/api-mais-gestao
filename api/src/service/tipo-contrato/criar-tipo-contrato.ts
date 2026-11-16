import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoTipoContrato,
	TipoContrato,
} from "@/model/tipo-contrato-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarGrupoContratoPorId } from "@/repositories/grupo-contrato-repositories.js";
import {
	criarTipoContrato,
	excluirTipoContrato,
} from "@/repositories/tipo-contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarTipoContratoParametros = {
	dadosTipoContrato: NovoTipoContrato;
	idusuario: string;
};

export async function criarTipoContratoService({
	dadosTipoContrato,
	idusuario,
}: CriarTipoContratoParametros): Promise<HttpResponse<TipoContrato | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosTipoContrato.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (dadosTipoContrato.idgrupocontrato) {
		const grupo = await buscarGrupoContratoPorId(dadosTipoContrato.idgrupocontrato);
		if (!grupo || grupo.idempresa !== dadosTipoContrato.idempresa) {
			return httpBadRequest("Grupo de contrato não encontrado");
		}
	}

	const registro = await criarTipoContrato(dadosTipoContrato);

	if (!registro) {
		return httpErro();
	}

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_tipo_contrato",
		idusuario,
		recurso: "tipo_contrato",
		idrecurso: registro.id,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
			descricao: registro.descricao,
			valor: registro.valor,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirTipoContrato(registro.id);
		return httpErroInterno();
	}

	return httpCriacao(registro);
}
