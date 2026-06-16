import { v4 as uuidv4 } from "uuid";
import type {
	EnquatramentoIPI,
	NovoEnquatramentoIPI,
} from "@/model/enquantramento-ipi-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarEnquatramentoIpi,
	buscarEnquatramentoIpiPorId,
} from "@/repositories/enquatramento-ipi-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import type { AtualizacaoParcial } from "@/util/type-util.js";

type AtualizarEnquatramentoIpiParametros = {
	enquatramentoIpiId: string;
	idusuario: string;
	dados: AtualizacaoParcial<NovoEnquatramentoIPI>;
};

export async function atualizarEnquatramentoIpiService({
	enquatramentoIpiId,
	idusuario,
	dados,
}: AtualizarEnquatramentoIpiParametros): Promise<
	HttpResponse<EnquatramentoIPI | null>
> {
	const registroExistente =
		await buscarEnquatramentoIpiPorId(enquatramentoIpiId);

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

	const registroAtualizado = await atualizarEnquatramentoIpi(
		enquatramentoIpiId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_enquatramento_ipi",
		idusuario,
		recurso: "enquatramento_ipi",
		idrecurso: enquatramentoIpiId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<EnquatramentoIPI>(registroAtualizado);
}
