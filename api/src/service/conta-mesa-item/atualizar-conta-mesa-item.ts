import { v4 as uuidv4 } from "uuid";
import type {
	ContaMesaItem,
	NovoContaMesaItem,
} from "@/model/conta-mesa-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarContaMesaPorId } from "@/repositories/conta-mesa-repositories.js";
import {
	atualizarContaMesaItem,
	buscarContaMesaItemPorId,
} from "@/repositories/conta-mesa-item-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarContaMesaItemParametros = {
	contaMesaItemId: string;
	idusuario: string;
	dados: Partial<NovoContaMesaItem>;
};

export async function atualizarContaMesaItemService({
	contaMesaItemId,
	idusuario,
	dados,
}: AtualizarContaMesaItemParametros): Promise<HttpResponse<ContaMesaItem | null>> {
	const registroExistente = await buscarContaMesaItemPorId(contaMesaItemId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const contaMesa = await buscarContaMesaPorId(registroExistente.idcontamesa);

	if (!contaMesa) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		contaMesa.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarContaMesaItem(
		contaMesaItemId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_conta_mesa_item",
		idusuario,
		recurso: "conta_mesa_item",
		idrecurso: contaMesaItemId,
		idempresa: contaMesa.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<ContaMesaItem>(registroAtualizado);
}
