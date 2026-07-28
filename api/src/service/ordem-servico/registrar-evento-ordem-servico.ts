import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { OrdemServicoEvento } from "@/model/ordem-servico-evento-model.js";
import type { OrdemServico } from "@/model/ordem-servico-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarOrdemServicoEvento } from "@/repositories/ordem-servico-evento-repositories.js";
import {
	atualizarOrdemServico,
	buscarOrdemServicoPorIdEempresa,
} from "@/repositories/ordem-servico-repositories.js";
import {
	buscarTipoOrdemServicoEventoPorId,
	listarTiposOrdemServicoEvento,
} from "@/repositories/tipo-ordem-servico-evento-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";
import {
	type OrdemServicoStatusCodigo,
	podeTransicionarStatus,
} from "@/util/ordem-servico-constants.js";

type RegistrarEventoOrdemServicoParametros = {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
	idtipoevento: string;
	descricao: string;
	idtecnicode?: string | undefined;
	idtecnicopara?: string | undefined;
	nomecontato?: string | undefined;
};

type RegistrarEventoResposta = {
	evento: OrdemServicoEvento;
	ordemServico: OrdemServico;
};

export async function registrarEventoOrdemServicoService({
	ordemServicoId,
	idempresa,
	idusuario,
	idtipoevento,
	descricao,
	idtecnicode,
	idtecnicopara,
	nomecontato,
}: RegistrarEventoOrdemServicoParametros): Promise<
	HttpResponse<RegistrarEventoResposta | null>
> {
	const os = await buscarOrdemServicoPorIdEempresa(ordemServicoId, idempresa);
	if (!os) return httpNaoEncontrado();

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	const tipo = await buscarTipoOrdemServicoEventoPorId(idtipoevento, idempresa);
	if (!tipo || tipo.ativo !== 1) {
		return httpBadRequest("Tipo de evento inválido ou inativo");
	}

	const tipos = await listarTiposOrdemServicoEvento(idempresa);
	const tipoAtual = tipos.find((item) => item.status === os.status);
	if (tipoAtual) {
		const permitido = podeTransicionarStatus(
			tipoAtual.codigo as OrdemServicoStatusCodigo,
			tipo.codigo as OrdemServicoStatusCodigo,
		);
		if (!permitido) {
			return httpBadRequest(
				`Transição de status inválida: ${tipoAtual.descricao} → ${tipo.descricao}`,
			);
		}
	}

	const agora = new Date().toISOString();
	const evento = await criarOrdemServicoEvento({
		id: uuidv4(),
		idempresa,
		idordemservico: ordemServicoId,
		idtipoevento,
		descricao,
		idtecnicode: idtecnicode ?? null,
		idtecnicopara: idtecnicopara ?? null,
		nomecontato: nomecontato ?? null,
		data: agora,
		datacriacao: agora,
		dataalteracao: agora,
	});

	if (!evento) {
		return httpBadRequest("Falha ao registrar evento");
	}

	const ordemServico = await atualizarOrdemServico(ordemServicoId, idempresa, {
		status: tipo.status,
		existeevento: 1,
		dataultimoevento: agora,
		descricaotipoultimoevento: tipo.descricao,
		descricaoultimoevento: descricao,
		idultimotecnico: idtecnicopara ?? os.idultimotecnico,
	});

	if (!ordemServico) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "registrar_evento_ordem_servico",
		idusuario,
		recurso: "ordem_servico",
		idrecurso: ordemServicoId,
		idempresa,
		criadoem: agora,
		metadados: {
			codigoTipo: tipo.codigo,
			descricao,
		},
	});

	return httpCriacao({ evento, ordemServico });
}
