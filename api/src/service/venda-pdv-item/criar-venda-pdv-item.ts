import { v4 as uuidv4 } from "uuid";
import type {
	NovoVendaPdvItem,
	VendaPdvItem,
} from "@/model/venda-pdv-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarVendaPdvItem,
	excluirVendaPdvItem,
} from "@/repositories/venda-pdv-item-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
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

	const registro = await criarVendaPdvItem(dadosVendaPdvItem);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
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
	});

	if (!auditoria || !auditoria.success) {
		await excluirVendaPdvItem(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<VendaPdvItem>(registro);
}
