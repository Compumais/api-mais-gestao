import { v4 as uuidv4 } from "uuid";
import type {
	CodigoReduzidoContaContabil,
	NovoCodigoReduzidoContaContabil,
} from "@/model/codigo-reduzido-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCodigoReduzidoContaContabil,
	buscarCodigoReduzidoContaContabilPorId,
} from "@/repositories/codigo-reduzido-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarCodigoReduzidoContaContabilParametros = {
	codigoReduzidoContaContabilId: string;
	idusuario: string;
	dados: Partial<NovoCodigoReduzidoContaContabil>;
};

export async function atualizarCodigoReduzidoContaContabilService({
	codigoReduzidoContaContabilId,
	idusuario,
	dados,
}: AtualizarCodigoReduzidoContaContabilParametros): Promise<
	HttpResponse<CodigoReduzidoContaContabil | null>
> {
	const registroExistente = await buscarCodigoReduzidoContaContabilPorId(
		codigoReduzidoContaContabilId,
	);

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

	const registroAtualizado = await atualizarCodigoReduzidoContaContabil(
		codigoReduzidoContaContabilId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_codigo_reduzido_conta_contabil",
		idusuario,
		recurso: "codigo_reduzido_conta_contabil",
		idrecurso: codigoReduzidoContaContabilId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<CodigoReduzidoContaContabil>(registroAtualizado);
}
