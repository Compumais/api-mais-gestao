import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarContaMesaPorId } from "@/repositories/conta-mesa-repositories.js";
import {
	buscarContaMesaItemPorId,
	excluirContaMesaItem,
} from "@/repositories/conta-mesa-item-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirContaMesaItemParametros = {
	contaMesaItemId: string;
	idusuario: string;
};

export async function excluirContaMesaItemService({
	contaMesaItemId,
	idusuario,
}: ExcluirContaMesaItemParametros): Promise<HttpResponse<null>> {
	const registro = await buscarContaMesaItemPorId(contaMesaItemId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const contaMesa = await buscarContaMesaPorId(registro.idcontamesa);

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

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_conta_mesa_item",
		idusuario,
		recurso: "conta_mesa_item",
		idrecurso: contaMesaItemId,
		idempresa: contaMesa.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idcontamesa: registro.idcontamesa,
			nomeproduto: registro.nomeproduto,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirContaMesaItem(contaMesaItemId);

	return httpSemConteudo();
}
