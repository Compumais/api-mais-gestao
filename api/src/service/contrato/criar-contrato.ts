import { v4 as uuidv4 } from "uuid";
import type { Contrato, NovoContrato } from "@/model/contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import { criarContrato } from "@/repositories/contrato-repositories.js";
import { buscarTipoContratoPorId } from "@/repositories/tipo-contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import { validarDadosContrato } from "./validar-contrato.js";

type CriarContratoParametros = {
	dados: NovoContrato;
	idusuario: string;
};

export async function criarContratoService({
	dados,
	idusuario,
}: CriarContratoParametros): Promise<HttpResponse<Contrato | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);
	if (!pertence) return httpProibido();

	const erro = validarDadosContrato(dados);
	if (erro) return httpBadRequest(erro);

	const cliente = await buscarEntidadePorId(dados.identidade);
	if (!cliente || cliente.idempresa !== dados.idempresa) {
		return httpBadRequest("Cliente não encontrado");
	}
	if (cliente.cliente !== 1) {
		return httpBadRequest("A entidade informada não é um cliente");
	}

	if (dados.idtipocontrato) {
		const tipo = await buscarTipoContratoPorId(dados.idtipocontrato);
		if (!tipo || tipo.idempresa !== dados.idempresa) {
			return httpBadRequest("Tipo de contrato não encontrado");
		}
	}

	const agora = new Date().toISOString();
	const registro = await criarContrato({
		...dados,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!registro) return httpErro();

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_contrato",
		idusuario,
		recurso: "contrato",
		idrecurso: registro.id,
		idempresa: registro.idempresa,
		criadoem: agora,
		metadados: {
			descricao: registro.descricao,
			fluxofaturamento: registro.fluxofaturamento,
			identidade: registro.identidade,
		},
	});

	if (!auditoria?.success) {
		return httpErroInterno();
	}

	return httpCriacao(registro);
}
