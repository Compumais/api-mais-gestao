import { v4 as uuidv4 } from "uuid";
import type {
	GrupoContrato,
	NovoGrupoContrato,
} from "@/model/grupo-contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarGrupoContrato,
	buscarGrupoContratoPorId,
} from "@/repositories/grupo-contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type DadosAtualizar = Partial<Pick<NovoGrupoContrato, "codigo" | "descricao">>;

export async function atualizarGrupoContratoService({
	grupoContratoId,
	idusuario,
	dados,
}: {
	grupoContratoId: string;
	idusuario: string;
	dados: DadosAtualizar;
}): Promise<HttpResponse<GrupoContrato | null>> {
	const existente = await buscarGrupoContratoPorId(grupoContratoId);
	if (!existente) return httpNaoEncontrado();

	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		existente.idempresa,
	);
	if (!pertence) return httpProibido();

	const atualizado = await atualizarGrupoContrato(grupoContratoId, dados);
	if (!atualizado) return httpNaoEncontrado();

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_grupo_contrato",
		idusuario,
		recurso: "grupo_contrato",
		idrecurso: grupoContratoId,
		idempresa: existente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: { camposAlterados: Object.keys(dados), valores: dados },
	});

	return httpOk(atualizado);
}
