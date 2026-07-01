import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	FatorConversao,
	NovoFatorConversao,
} from "@/model/fator-conversao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarFatorConversao,
	buscarFatorConversaoPorId,
} from "@/repositories/fator-conversao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarFatorConversaoParametros = {
	fatorConversaoId: string;
	idusuario: string;
	dados: Partial<NovoFatorConversao>;
};

export async function atualizarFatorConversaoService({
	fatorConversaoId,
	idusuario,
	dados,
}: AtualizarFatorConversaoParametros): Promise<
	HttpResponse<FatorConversao | null>
> {
	const registroExistente = await buscarFatorConversaoPorId(fatorConversaoId);

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

	const { idempresa: _idempresa, ...dadosAtualizacao } = dados;

	const registroAtualizado = await atualizarFatorConversao(fatorConversaoId, {
		...dadosAtualizacao,
		currenttimemillis: Date.now(),
	});

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_fator_conversao",
		idusuario,
		recurso: "fator_conversao",
		idrecurso: fatorConversaoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dadosAtualizacao),
			valores: dadosAtualizacao,
		},
	});

	return httpOk<FatorConversao>(registroAtualizado);
}
