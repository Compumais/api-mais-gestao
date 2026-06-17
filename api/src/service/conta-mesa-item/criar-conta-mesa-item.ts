import { v4 as uuidv4 } from "uuid";
import type {
	ContaMesaItem,
	NovoContaMesaItem,
} from "@/model/conta-mesa-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarContaMesaPorId } from "@/repositories/conta-mesa-repositories.js";
import {
	criarContaMesaItem,
	excluirContaMesaItem,
} from "@/repositories/conta-mesa-item-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { validarUnidadeMedidaParaEmpresa } from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

type CriarContaMesaItemParametros = {
	dadosContaMesaItem: NovoContaMesaItem;
	idusuario: string;
};

export async function criarContaMesaItemService({
	dadosContaMesaItem,
	idusuario,
}: CriarContaMesaItemParametros): Promise<HttpResponse<ContaMesaItem | null>> {
	const contaMesa = await buscarContaMesaPorId(dadosContaMesaItem.idcontamesa);

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

	const unidadeValida = await validarUnidadeMedidaParaEmpresa(
		dadosContaMesaItem.unidademedida,
		contaMesa.idempresa,
	);

	if (!unidadeValida) {
		return httpProibido();
	}

	const registro = await criarContaMesaItem(dadosContaMesaItem);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_conta_mesa_item",
		idusuario,
		recurso: "conta_mesa_item",
		idrecurso: registro.id,
		idempresa: contaMesa.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idcontamesa: registro.idcontamesa,
			nomeproduto: registro.nomeproduto,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirContaMesaItem(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<ContaMesaItem>(registro);
}
