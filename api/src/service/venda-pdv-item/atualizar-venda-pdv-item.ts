import { v4 as uuidv4 } from "uuid";
import type {
	NovoVendaPdvItem,
	VendaPdvItem,
} from "@/model/venda-pdv-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarVendaPdvItem,
	buscarVendaPdvItemPorId,
} from "@/repositories/venda-pdv-item-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarVendaPdvItemParametros = {
	vendaPdvItemId: string;
	idusuario: string;
	dados: Partial<NovoVendaPdvItem>;
};

export async function atualizarVendaPdvItemService({
	vendaPdvItemId,
	idusuario,
	dados,
}: AtualizarVendaPdvItemParametros): Promise<HttpResponse<VendaPdvItem | null>> {
	const registroExistente = await buscarVendaPdvItemPorId(vendaPdvItemId);

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

	const registroAtualizado = await atualizarVendaPdvItem(vendaPdvItemId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_venda_pdv_item",
		idusuario,
		recurso: "venda_pdv_item",
		idrecurso: vendaPdvItemId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<VendaPdvItem>(registroAtualizado);
}
