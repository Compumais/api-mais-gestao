import { v4 as uuidv4 } from "uuid";
import type { Equipamento } from "@/model/equipamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarEquipamento,
	buscarEquipamentoPorCodigo,
	buscarEquipamentoPorIdEempresa,
} from "@/repositories/equipamento-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { moedaLocacao } from "@/util/locacao-calculo.js";
import { mensagemConflitoUnico } from "@/util/locacao-erro.js";

type AtualizarEquipamentoParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
	codigo: string;
	descricao: string;
	numeroserie?: string | null;
	situacao?: "disponivel" | "inativo" | "alocado";
	precodiaria: number;
	precosemanal: number;
	precoquinzenal: number;
	precomensal: number;
	observacao?: string | null;
};

function precoInvalido(valor: number) {
	return !Number.isFinite(valor) || valor < 0;
}

export async function atualizarEquipamentoService(
	dados: AtualizarEquipamentoParametros,
): Promise<HttpResponse<Equipamento | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		dados.idusuario,
		dados.idempresa,
	);
	if (!pertence) return httpProibido();

	const atual = await buscarEquipamentoPorIdEempresa(dados.id, dados.idempresa);
	if (!atual) return httpNaoEncontrado("Equipamento não encontrado");

	if (
		precoInvalido(dados.precodiaria) ||
		precoInvalido(dados.precosemanal) ||
		precoInvalido(dados.precoquinzenal) ||
		precoInvalido(dados.precomensal)
	) {
		return httpBadRequest("Preços do equipamento devem ser zero ou positivos");
	}

	if (dados.situacao === "alocado" && atual.situacao !== "alocado") {
		return httpBadRequest("A situação de alocado é definida pela locação");
	}

	const codigo = dados.codigo.trim();
	if (!codigo) return httpBadRequest("Informe o código");
	if (codigo !== atual.codigo) {
		const duplicado = await buscarEquipamentoPorCodigo(dados.idempresa, codigo);
		if (duplicado && duplicado.id !== atual.id) {
			return httpBadRequest("Código já utilizado nesta empresa");
		}
	}

	try {
		const registro = await atualizarEquipamento(atual.id, {
			codigo,
			descricao: dados.descricao.trim(),
			numeroserie: dados.numeroserie?.trim() || null,
			situacao:
				atual.situacao === "alocado"
					? "alocado"
					: (dados.situacao ?? atual.situacao),
			precodiaria: moedaLocacao(dados.precodiaria),
			precosemanal: moedaLocacao(dados.precosemanal),
			precoquinzenal: moedaLocacao(dados.precoquinzenal),
			precomensal: moedaLocacao(dados.precomensal),
			observacao: dados.observacao?.trim() || null,
		});
		if (!registro) return httpErroInterno();

		const auditoria = await criarAuditoriaService({
			id: uuidv4(),
			acao: "atualizar_equipamento",
			idusuario: dados.idusuario,
			recurso: "equipamento",
			idrecurso: registro.id,
			idempresa: registro.idempresa,
			criadoem: new Date().toISOString(),
			metadados: { codigo: registro.codigo, situacao: registro.situacao },
		});
		if (!auditoria.success) return httpErroInterno();
		return httpOk(registro);
	} catch (error) {
		const conflito = mensagemConflitoUnico(error);
		if (conflito) return httpBadRequest(conflito);
		throw error;
	}
}
