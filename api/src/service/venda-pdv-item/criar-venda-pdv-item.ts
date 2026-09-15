import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoVendaPdvItem,
	VendaPdvItem,
} from "@/model/venda-pdv-item-model.js";
import { buscarAuditoriaPorRecurso } from "@/repositories/auditoria-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarOuBuscarVendaPdvItem,
	excluirVendaPdvItem,
} from "@/repositories/venda-pdv-item-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarVendaPdvItemParametros = {
	dadosVendaPdvItem: NovoVendaPdvItem;
	idusuario: string;
};

export async function criarVendaPdvItemService({
	dadosVendaPdvItem,
	idusuario,
}: CriarVendaPdvItemParametros): Promise<HttpResponse<VendaPdvItem | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosVendaPdvItem.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const criacao = await criarOuBuscarVendaPdvItem(dadosVendaPdvItem);

	if (!criacao) {
		return httpErro();
	}
	const { registro } = criacao;
	if (
		registro.idempresa !== dadosVendaPdvItem.idempresa ||
		registro.idvenda !== dadosVendaPdvItem.idvenda ||
		registro.idproduto !== dadosVendaPdvItem.idproduto
	) {
		return httpBadRequest(
			"Identidade local do item já utilizada em outra venda",
		);
	}

	const auditoriaExistente = await buscarAuditoriaPorRecurso(
		dadosVendaPdvItem.idempresa,
		"venda_pdv_item",
		registro.id,
	);
	const auditoria =
		auditoriaExistente ??
		(await criarAuditoriaService({
			id: uuidv4(),
			acao: "criar_venda_pdv_item",
			idusuario,
			recurso: "venda_pdv_item",
			idrecurso: registro.id,
			idempresa: dadosVendaPdvItem.idempresa,
			criadoem: new Date().toISOString(),
			metadados: {
				idvenda: registro.idvenda,
				idproduto: registro.idproduto,
			},
		}));

	if (!auditoria || ("success" in auditoria && !auditoria.success)) {
		if (criacao.criado) {
			await excluirVendaPdvItem(registro.id);
		}
		return httpErroInterno();
	}

	return httpCriacao<VendaPdvItem>(registro);
}
