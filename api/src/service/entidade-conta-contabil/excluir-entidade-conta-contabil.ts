import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarEntidadeContaContabilPorId,
	excluirEntidadeContaContabil,
} from "@/repositories/entidade-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirEntidadeContaContabilParametros = {
	entidadeContaContabilId: string;
	idusuario: string;
};

export async function excluirEntidadeContaContabilService({
	entidadeContaContabilId,
	idusuario,
}: ExcluirEntidadeContaContabilParametros): Promise<HttpResponse<null>> {
	const registro = await buscarEntidadeContaContabilPorId(
		entidadeContaContabilId,
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
		acao: "excluir_entidade_conta_contabil",
		idusuario,
		recurso: "entidade_conta_contabil",
		idrecurso: entidadeContaContabilId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			identidade: registro.identidade,
			idcontacontabil: registro.idcontacontabil,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirEntidadeContaContabil(entidadeContaContabilId);

	return httpSemConteudo();
}
