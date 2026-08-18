import { v4 as uuidv4 } from "uuid";
import type {
	BandeiraCartao,
	NovaBandeiraCartao,
} from "@/model/bandeira-cartao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarBandeiraCartao,
	buscarBandeiraCartaoPorId,
} from "@/repositories/bandeira-cartao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import type { AtualizacaoParcial } from "@/util/type-util.js";

type AtualizarBandeiraCartaoParametros = {
	bandeiraCartaoId: string;
	idusuario: string;
	dados: AtualizacaoParcial<NovaBandeiraCartao>;
};

export async function atualizarBandeiraCartaoService({
	bandeiraCartaoId,
	idusuario,
	dados,
}: AtualizarBandeiraCartaoParametros): Promise<
	HttpResponse<BandeiraCartao | null>
> {
	const registroExistente = await buscarBandeiraCartaoPorId(bandeiraCartaoId);

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

	const registroAtualizado = await atualizarBandeiraCartao(
		bandeiraCartaoId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_bandeira_cartao",
		idusuario,
		recurso: "bandeira_cartao",
		idrecurso: bandeiraCartaoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<BandeiraCartao>(registroAtualizado);
}
