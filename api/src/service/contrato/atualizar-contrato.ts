import { v4 as uuidv4 } from "uuid";
import type { Contrato, NovoContrato } from "@/model/contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarContrato,
	buscarContratoPorIdEempresa,
} from "@/repositories/contrato-repositories.js";
import { buscarTipoContratoPorId } from "@/repositories/tipo-contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { validarDadosContrato } from "./validar-contrato.js";

type AtualizarContratoParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
	dados: Partial<NovoContrato>;
};

export async function atualizarContratoService({
	id,
	idempresa,
	idusuario,
	dados,
}: AtualizarContratoParametros): Promise<HttpResponse<Contrato>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const existente = await buscarContratoPorIdEempresa(id, idempresa);
	if (!existente) return httpNaoEncontrado();

	const merged = { ...existente, ...dados };
	const erro = validarDadosContrato(merged);
	if (erro) return httpBadRequest(erro);

	if (dados.idtipocontrato) {
		const tipo = await buscarTipoContratoPorId(dados.idtipocontrato);
		if (!tipo || tipo.idempresa !== idempresa) {
			return httpBadRequest("Tipo de contrato não encontrado");
		}
	}

	const atualizado = await atualizarContrato(id, dados);
	if (!atualizado) return httpNaoEncontrado();

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_contrato",
		idusuario,
		recurso: "contrato",
		idrecurso: atualizado.id,
		idempresa: atualizado.idempresa,
		criadoem: new Date().toISOString(),
		metadados: dados,
	});

	return httpOk(atualizado);
}
