import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoOrdemServico,
	OrdemServico,
} from "@/model/ordem-servico-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarOrdemServicoEvento } from "@/repositories/ordem-servico-evento-repositories.js";
import {
	criarOrdemServico,
	excluirOrdemServico,
} from "@/repositories/ordem-servico-repositories.js";
import { buscarProximoCodigoOrdemServico } from "@/repositories/proximo-codigo-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	buscarTipoEventoPadrao,
	garantirCatalogoTiposOrdemServico,
	garantirConfiguracaoOrdemServico,
	validarExtrasNaOrdemServico,
} from "@/service/ordem-servico/ordem-servico-helpers.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarOrdemServicoParametros = {
	dadosOrdemServico: Omit<NovoOrdemServico, "id" | "codigo"> & {
		codigo?: number | undefined;
	};
	idusuario: string;
};

export async function criarOrdemServicoService({
	dadosOrdemServico,
	idusuario,
}: CriarOrdemServicoParametros): Promise<HttpResponse<OrdemServico | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosOrdemServico.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	await garantirCatalogoTiposOrdemServico(dadosOrdemServico.idempresa);
	const config = await garantirConfiguracaoOrdemServico(
		dadosOrdemServico.idempresa,
	);

	const validacaoExtras = validarExtrasNaOrdemServico(
		config.camposextras,
		dadosOrdemServico as unknown as Record<string, string | null | undefined>,
	);
	if (!validacaoExtras.valido) {
		return httpBadRequest(validacaoExtras.erro ?? "Extras inválidos");
	}

	const tipoAberta = await buscarTipoEventoPadrao(
		dadosOrdemServico.idempresa,
		"ABERTA",
	);
	if (!tipoAberta) {
		return httpErroInterno();
	}

	const agora = new Date().toISOString();
	const codigo =
		dadosOrdemServico.codigo ??
		(await buscarProximoCodigoOrdemServico(dadosOrdemServico.idempresa));

	const registro = await criarOrdemServico({
		...dadosOrdemServico,
		id: uuidv4(),
		codigo,
		idusuario,
		status: tipoAberta.status,
		orcamento: dadosOrdemServico.orcamento ?? 0,
		existeevento: 1,
		dataultimoevento: agora,
		descricaotipoultimoevento: tipoAberta.descricao,
		descricaoultimoevento: "Ordem de serviço aberta",
		data: dadosOrdemServico.data ?? agora,
		dataos: dadosOrdemServico.dataos ?? agora.substring(0, 10),
		currenttimemillis: Date.now(),
		valor: dadosOrdemServico.valor ?? "0.00",
		valorprodutos: dadosOrdemServico.valorprodutos ?? "0.00",
		valorservicos: dadosOrdemServico.valorservicos ?? "0.00",
	});

	if (!registro) {
		return httpErro();
	}

	const evento = await criarOrdemServicoEvento({
		id: uuidv4(),
		idempresa: registro.idempresa,
		idordemservico: registro.id,
		idtipoevento: tipoAberta.id,
		descricao: "Ordem de serviço aberta",
		data: agora,
		datacriacao: agora,
		dataalteracao: agora,
	});

	if (!evento) {
		await excluirOrdemServico(registro.id, registro.idempresa);
		return httpErroInterno();
	}

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_ordem_servico",
		idusuario,
		recurso: "ordem_servico",
		idrecurso: registro.id,
		idempresa: registro.idempresa,
		criadoem: agora,
		metadados: {
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirOrdemServico(registro.id, registro.idempresa);
		return httpErroInterno();
	}

	return httpCriacao<OrdemServico>(registro);
}
