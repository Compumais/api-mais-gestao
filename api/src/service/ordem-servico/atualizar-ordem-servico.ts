import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoOrdemServico,
	OrdemServico,
} from "@/model/ordem-servico-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarOrdemServico,
	buscarOrdemServicoPorIdEempresa,
} from "@/repositories/ordem-servico-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	garantirConfiguracaoOrdemServico,
	validarExtrasNaOrdemServico,
} from "@/service/ordem-servico/ordem-servico-helpers.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { validarUsuariosDaEmpresa } from "@/util/validar-usuario-empresa.js";

const CAMPOS_BLOQUEADOS = new Set([
	"id",
	"idempresa",
	"codigo",
	"status",
	"geroufinanceiro",
	"faturouparanota",
	"faturouparacupom",
	"iddocumentofiscal",
	"iddavos",
	"existeevento",
	"dataultimoevento",
	"descricaotipoultimoevento",
	"descricaoultimoevento",
]);

type AtualizarOrdemServicoParametros = {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
	dados: Partial<NovoOrdemServico>;
};

export async function atualizarOrdemServicoService({
	ordemServicoId,
	idempresa,
	idusuario,
	dados,
}: AtualizarOrdemServicoParametros): Promise<
	HttpResponse<OrdemServico | null>
> {
	const registroExistente = await buscarOrdemServicoPorIdEempresa(
		ordemServicoId,
		idempresa,
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

	const dadosLimpos: Partial<NovoOrdemServico> = {};
	for (const [chave, valor] of Object.entries(dados)) {
		if (CAMPOS_BLOQUEADOS.has(chave)) continue;
		(dadosLimpos as Record<string, unknown>)[chave] = valor;
	}

	const config = await garantirConfiguracaoOrdemServico(idempresa);
	const validacaoExtras = validarExtrasNaOrdemServico(config.camposextras, {
		...registroExistente,
		...dadosLimpos,
	} as Record<string, string | null | undefined>);

	if (!validacaoExtras.valido) {
		return httpBadRequest(validacaoExtras.erro ?? "Extras inválidos");
	}

	const erroUsuarios = await validarUsuariosDaEmpresa(
		[
			{
				id:
					dadosLimpos.idatendente !== undefined
						? dadosLimpos.idatendente
						: registroExistente.idatendente,
				rotulo: "Atendente",
			},
			{
				id:
					dadosLimpos.idultimotecnico !== undefined
						? dadosLimpos.idultimotecnico
						: registroExistente.idultimotecnico,
				rotulo: "Técnico",
			},
		],
		idempresa,
	);
	if (erroUsuarios) {
		return httpBadRequest(erroUsuarios);
	}

	if (config.usaarea === 0) {
		dadosLimpos.idarea = null;
	}
	if (config.usaobjeto === 0) {
		dadosLimpos.idobjeto = null;
	}
	if (config.usatipoproblema === 0) {
		dadosLimpos.idtipoproblema = null;
	}
	if (config.usadadosveiculo === 0) {
		dadosLimpos.marca = null;
		dadosLimpos.modelo = null;
		dadosLimpos.placa = null;
		dadosLimpos.renavam = null;
		dadosLimpos.anofabricacao = null;
		dadosLimpos.numerofabricacao = null;
	}

	const registroAtualizado = await atualizarOrdemServico(
		ordemServicoId,
		idempresa,
		dadosLimpos,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_ordem_servico",
		idusuario,
		recurso: "ordem_servico",
		idrecurso: ordemServicoId,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dadosLimpos),
		},
	});

	return httpOk<OrdemServico>(registroAtualizado);
}
