import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { Locacao } from "@/model/locacao-model.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import { buscarEquipamentosPorIds } from "@/repositories/equipamento-repositories.js";
import {
	buscarLocacaoPorCodigo,
	buscarLocacaoPorIdEempresa,
	listarItensLocacao,
	salvarLocacaoAberta,
} from "@/repositories/locacao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { montarItensLocacao } from "@/service/locacao/montar-itens-locacao.js";
import {
	type EntradaLocacao,
	textoOpcional,
	validarEntradaLocacao,
} from "@/service/locacao/validar-locacao.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { moedaLocacao } from "@/util/locacao-calculo.js";
import {
	ErroNegocioLocacao,
	mensagemConflitoUnico,
} from "@/util/locacao-erro.js";

type AtualizarLocacaoParametros = EntradaLocacao & {
	id: string;
	idempresa: string;
	idusuario: string;
	codigo: string;
};

export async function atualizarLocacaoService(
	dados: AtualizarLocacaoParametros,
): Promise<HttpResponse<Locacao | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		dados.idusuario,
		dados.idempresa,
	);
	if (!pertence) return httpProibido();

	const atual = await buscarLocacaoPorIdEempresa(dados.id, dados.idempresa);
	if (!atual) return httpNaoEncontrado("Locação não encontrada");
	if (atual.locacao.situacao !== "aberta") {
		return httpBadRequest("Somente locação aberta pode ser alterada");
	}

	const validacao = validarEntradaLocacao(dados);
	if ("erro" in validacao) return httpBadRequest(validacao.erro);

	const cliente = await buscarEntidadePorId(dados.identidade);
	if (
		!cliente ||
		cliente.idempresa !== dados.idempresa ||
		cliente.cliente !== 1
	) {
		return httpBadRequest("Cliente não encontrado");
	}

	const codigo = dados.codigo.trim();
	if (!codigo) return httpBadRequest("Informe o código");
	if (codigo !== atual.locacao.codigo) {
		const duplicado = await buscarLocacaoPorCodigo(dados.idempresa, codigo);
		if (duplicado && duplicado.id !== atual.locacao.id) {
			return httpBadRequest("Código já utilizado nesta empresa");
		}
	}

	const equipamentos = await buscarEquipamentosPorIds(
		dados.idempresa,
		validacao.linhas.map((linha) => linha.idequipamento),
	);
	if (equipamentos.length !== validacao.linhas.length) {
		return httpBadRequest("Equipamento não encontrado");
	}

	const itensAtuais = await listarItensLocacao(atual.locacao.id);
	const idsAtuais = new Set(itensAtuais.map((item) => item.item.idequipamento));
	const idsNovos = new Set(
		validacao.linhas.map((linha) => linha.idequipamento),
	);

	for (const equipamento of equipamentos) {
		if (idsAtuais.has(equipamento.id)) continue;
		if (equipamento.situacao !== "disponivel") {
			return httpBadRequest(
				`Equipamento ${equipamento.codigo} - ${equipamento.descricao} não está disponível`,
			);
		}
	}

	const montado = montarItensLocacao({
		idlocacao: atual.locacao.id,
		datainicio: dados.datainicio,
		linhas: validacao.linhas,
		equipamentos,
		itensAnteriores: itensAtuais.map((item) => item.item),
	});

	try {
		const registro = await salvarLocacaoAberta({
			modo: "atualizar",
			idsEquipamentosLiberar: [...idsAtuais].filter((id) => !idsNovos.has(id)),
			idsEquipamentosAlocar: [...idsNovos].filter((id) => !idsAtuais.has(id)),
			itens: montado.itens,
			locacao: {
				...atual.locacao,
				identidade: dados.identidade,
				codigo,
				datainicio: dados.datainicio,
				cep: textoOpcional(dados.cep),
				endereco: textoOpcional(dados.endereco),
				numeroendereco: textoOpcional(dados.numeroendereco),
				complemento: textoOpcional(dados.complemento),
				bairro: textoOpcional(dados.bairro),
				idcidade: textoOpcional(dados.idcidade),
				idestado: textoOpcional(dados.idestado),
				valorperiodo: moedaLocacao(montado.valorperiodo),
				valormora: moedaLocacao(0),
				valortotal: moedaLocacao(montado.valortotal),
				observacao: textoOpcional(dados.observacao),
				situacao: "aberta",
			},
		});

		const auditoria = await criarAuditoriaService({
			id: uuidv4(),
			acao: "atualizar_locacao",
			idusuario: dados.idusuario,
			recurso: "locacao",
			idrecurso: registro.id,
			idempresa: registro.idempresa,
			criadoem: new Date().toISOString(),
			metadados: { codigo: registro.codigo },
		});
		if (!auditoria.success) return httpErroInterno();
		return httpOk(registro);
	} catch (error) {
		if (error instanceof ErroNegocioLocacao)
			return httpBadRequest(error.message);
		const conflito = mensagemConflitoUnico(error);
		if (conflito) return httpBadRequest(conflito);
		throw error;
	}
}
