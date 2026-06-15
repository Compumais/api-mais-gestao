import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarVendaPdvItemPorId,
	excluirVendaPdvItem,
} from "@/repositories/venda-pdv-item-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirVendaPdvItemParametros = {
	vendaPdvItemId: string;
	idusuario: string;
};

export async function excluirVendaPdvItemService({
	vendaPdvItemId,
	idusuario,
}: ExcluirVendaPdvItemParametros): Promise<HttpResponse<null>> {
	const registro = await buscarVendaPdvItemPorId(vendaPdvItemId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_venda_pdv_item",
		idusuario,
		recurso: "venda_pdv_item",
		idrecurso: vendaPdvItemId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idvenda: registro.idvenda,
			idproduto: registro.idproduto,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirVendaPdvItem(vendaPdvItemId);

	return httpSemConteudo();
}
