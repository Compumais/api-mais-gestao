import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoTipoContrato,
	TipoContrato,
} from "@/model/tipo-contrato-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarGrupoContratoPorId } from "@/repositories/grupo-contrato-repositories.js";
import {
	atualizarTipoContrato,
	buscarTipoContratoPorId,
} from "@/repositories/tipo-contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type DadosAtualizarTipoContrato = Partial<
	Pick<NovoTipoContrato, "codigo" | "descricao" | "valor" | "idgrupocontrato">
>;

type AtualizarTipoContratoParametros = {
	tipoContratoId: string;
	idusuario: string;
	dados: DadosAtualizarTipoContrato;
};

export async function atualizarTipoContratoService({
	tipoContratoId,
	idusuario,
	dados,
}: AtualizarTipoContratoParametros): Promise<
	HttpResponse<TipoContrato | null>
> {
	const registroExistente = await buscarTipoContratoPorId(tipoContratoId);

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

	if (dados.idgrupocontrato) {
		const grupo = await buscarGrupoContratoPorId(dados.idgrupocontrato);
		if (!grupo || grupo.idempresa !== registroExistente.idempresa) {
			return httpBadRequest("Grupo de contrato não encontrado");
		}
	}

	const registroAtualizado = await atualizarTipoContrato(tipoContratoId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_tipo_contrato",
		idusuario,
		recurso: "tipo_contrato",
		idrecurso: tipoContratoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk(registroAtualizado);
}
