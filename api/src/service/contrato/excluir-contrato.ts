import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarContratoPorIdEempresa,
	contarCobrancasPorContrato,
	excluirContrato,
} from "@/repositories/contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirContratoParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
};

export async function excluirContratoService({
	id,
	idempresa,
	idusuario,
}: ExcluirContratoParametros): Promise<HttpResponse<null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const existente = await buscarContratoPorIdEempresa(id, idempresa);
	if (!existente) return httpNaoEncontrado();

	const cobrancas = await contarCobrancasPorContrato(id);
	if (cobrancas > 0) {
		return httpBadRequest(
			"Contrato possui cobranças e não pode ser excluído. Encerre ou suspenda o contrato.",
		);
	}

	await excluirContrato(id);

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_contrato",
		idusuario,
		recurso: "contrato",
		idrecurso: id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: { descricao: existente.descricao },
	});

	return httpSemConteudo();
}
