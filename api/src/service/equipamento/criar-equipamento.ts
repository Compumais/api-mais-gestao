import { v4 as uuidv4 } from "uuid";
import type { Equipamento } from "@/model/equipamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarEquipamentoPorCodigo,
	criarEquipamento,
} from "@/repositories/equipamento-repositories.js";
import { buscarProximoCodigoEquipamento } from "@/repositories/proximo-codigo-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import { moedaLocacao } from "@/util/locacao-calculo.js";
import { mensagemConflitoUnico } from "@/util/locacao-erro.js";

type CriarEquipamentoParametros = {
	idempresa: string;
	idusuario: string;
	codigo?: string | null;
	descricao: string;
	numeroserie?: string | null;
	situacao?: "disponivel" | "inativo";
	precodiaria: number;
	precosemanal: number;
	precoquinzenal: number;
	precomensal: number;
	observacao?: string | null;
};

function precoInvalido(valor: number) {
	return !Number.isFinite(valor) || valor < 0;
}

export async function criarEquipamentoService(
	dados: CriarEquipamentoParametros,
): Promise<HttpResponse<Equipamento | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		dados.idusuario,
		dados.idempresa,
	);
	if (!pertence) return httpProibido();

	if (
		precoInvalido(dados.precodiaria) ||
		precoInvalido(dados.precosemanal) ||
		precoInvalido(dados.precoquinzenal) ||
		precoInvalido(dados.precomensal)
	) {
		return httpBadRequest("Preços do equipamento devem ser zero ou positivos");
	}

	const codigo =
		dados.codigo?.trim() ||
		(await buscarProximoCodigoEquipamento(dados.idempresa));
	const existente = await buscarEquipamentoPorCodigo(dados.idempresa, codigo);
	if (existente) return httpBadRequest("Código já utilizado nesta empresa");

	const agora = new Date().toISOString();
	try {
		const registro = await criarEquipamento({
			id: uuidv4(),
			idempresa: dados.idempresa,
			codigo,
			descricao: dados.descricao.trim(),
			numeroserie: dados.numeroserie?.trim() || null,
			situacao: dados.situacao ?? "disponivel",
			precodiaria: moedaLocacao(dados.precodiaria),
			precosemanal: moedaLocacao(dados.precosemanal),
			precoquinzenal: moedaLocacao(dados.precoquinzenal),
			precomensal: moedaLocacao(dados.precomensal),
			observacao: dados.observacao?.trim() || null,
			criadoem: agora,
			atualizadoem: agora,
		});
		if (!registro) return httpErroInterno();

		const auditoria = await criarAuditoriaService({
			id: uuidv4(),
			acao: "criar_equipamento",
			idusuario: dados.idusuario,
			recurso: "equipamento",
			idrecurso: registro.id,
			idempresa: registro.idempresa,
			criadoem: agora,
			metadados: { codigo: registro.codigo },
		});
		if (!auditoria.success) return httpErroInterno();
		return httpCriacao(registro);
	} catch (error) {
		const conflito = mensagemConflitoUnico(error);
		if (conflito) return httpBadRequest(conflito);
		throw error;
	}
}
