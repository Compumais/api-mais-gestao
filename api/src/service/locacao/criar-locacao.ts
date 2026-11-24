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
	salvarLocacaoAberta,
} from "@/repositories/locacao-repositories.js";
import { buscarProximoCodigoLocacao } from "@/repositories/proximo-codigo-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { montarItensLocacao } from "@/service/locacao/montar-itens-locacao.js";
import {
	type EntradaLocacao,
	lerCoordenadas,
	textoOpcional,
	validarEntradaLocacao,
} from "@/service/locacao/validar-locacao.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import { moedaLocacao } from "@/util/locacao-calculo.js";
import {
	ErroNegocioLocacao,
	mensagemConflitoUnico,
} from "@/util/locacao-erro.js";

type CriarLocacaoParametros = EntradaLocacao & {
	idempresa: string;
	idusuario: string;
};

export async function criarLocacaoService(
	dados: CriarLocacaoParametros,
): Promise<HttpResponse<Locacao | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		dados.idusuario,
		dados.idempresa,
	);
	if (!pertence) return httpProibido();

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

	const equipamentos = await buscarEquipamentosPorIds(
		dados.idempresa,
		validacao.linhas.map((linha) => linha.idequipamento),
	);
	if (equipamentos.length !== validacao.linhas.length) {
		return httpBadRequest("Equipamento não encontrado");
	}
	const indisponivel = equipamentos.find(
		(item) => item.situacao !== "disponivel",
	);
	if (indisponivel) {
		return httpBadRequest(
			`Equipamento ${indisponivel.codigo} - ${indisponivel.descricao} não está disponível`,
		);
	}

	const coordenadas = lerCoordenadas(dados.latitude, dados.longitude);
	if ("erro" in coordenadas) return httpBadRequest(coordenadas.erro);

	const codigo =
		dados.codigo?.trim() || (await buscarProximoCodigoLocacao(dados.idempresa));
	const duplicado = await buscarLocacaoPorCodigo(dados.idempresa, codigo);
	if (duplicado) return httpBadRequest("Código já utilizado nesta empresa");

	const id = uuidv4();
	const montado = montarItensLocacao({
		idlocacao: id,
		datainicio: dados.datainicio,
		linhas: validacao.linhas,
		equipamentos,
		itensAnteriores: [],
	});

	try {
		const registro = await salvarLocacaoAberta({
			modo: "criar",
			idsEquipamentosLiberar: [],
			idsEquipamentosAlocar: validacao.linhas.map(
				(linha) => linha.idequipamento,
			),
			itens: montado.itens,
			locacao: {
				id,
				idempresa: dados.idempresa,
				identidade: dados.identidade,
				codigo,
				situacao: "aberta",
				datainicio: dados.datainicio,
				cep: textoOpcional(dados.cep),
				endereco: textoOpcional(dados.endereco),
				numeroendereco: textoOpcional(dados.numeroendereco),
				complemento: textoOpcional(dados.complemento),
				bairro: textoOpcional(dados.bairro),
				idcidade: textoOpcional(dados.idcidade),
				idestado: textoOpcional(dados.idestado),
				latitude: coordenadas.latitude,
				longitude: coordenadas.longitude,
				valorperiodo: moedaLocacao(montado.valorperiodo),
				valormora: moedaLocacao(0),
				valortotal: moedaLocacao(montado.valortotal),
				observacao: textoOpcional(dados.observacao),
			},
		});

		const auditoria = await criarAuditoriaService({
			id: uuidv4(),
			acao: "criar_locacao",
			idusuario: dados.idusuario,
			recurso: "locacao",
			idrecurso: registro.id,
			idempresa: registro.idempresa,
			criadoem: new Date().toISOString(),
			metadados: { codigo: registro.codigo, identidade: registro.identidade },
		});
		if (!auditoria.success) return httpErroInterno();
		return httpCriacao(registro);
	} catch (error) {
		if (error instanceof ErroNegocioLocacao)
			return httpBadRequest(error.message);
		const conflito = mensagemConflitoUnico(error);
		if (conflito) return httpBadRequest(conflito);
		throw error;
	}
}
