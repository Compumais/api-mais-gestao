import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCodigoReduzidoContaContabilPorId,
	excluirCodigoReduzidoContaContabil,
} from "@/repositories/codigo-reduzido-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirCodigoReduzidoContaContabilParametros = {
	codigoReduzidoContaContabilId: string;
	idusuario: string;
};

export async function excluirCodigoReduzidoContaContabilService({
	codigoReduzidoContaContabilId,
	idusuario,
}: ExcluirCodigoReduzidoContaContabilParametros): Promise<HttpResponse<null>> {
	const registro = await buscarCodigoReduzidoContaContabilPorId(
		codigoReduzidoContaContabilId,
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
		acao: "excluir_codigo_reduzido_conta_contabil",
		idusuario,
		recurso: "codigo_reduzido_conta_contabil",
		idrecurso: codigoReduzidoContaContabilId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			id: registro.id,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirCodigoReduzidoContaContabil(codigoReduzidoContaContabilId);

	return httpSemConteudo();
}
