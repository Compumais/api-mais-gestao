import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarVendaPdvGourmetPorId,
	excluirVendaPdvGourmet,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirVendaPdvGourmetParametros = {
	vendaPdvGourmetId: string;
	idusuario: string;
};

export async function excluirVendaPdvGourmetService({
	vendaPdvGourmetId,
	idusuario,
}: ExcluirVendaPdvGourmetParametros): Promise<HttpResponse<null>> {
	const registro = await buscarVendaPdvGourmetPorId(vendaPdvGourmetId);

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
		acao: "excluir_venda_pdv_gourmet",
		idusuario,
		recurso: "venda_pdv_gourmet",
		idrecurso: vendaPdvGourmetId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numeropdv: registro.numeropdv,
			idcontamesa: registro.idcontamesa,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirVendaPdvGourmet(vendaPdvGourmetId);

	return httpSemConteudo();
}
