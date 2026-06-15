import { v4 as uuidv4 } from "uuid";
import type {
	NovaVendaPdvGourmet,
	VendaPdvGourmet,
} from "@/model/venda-pdv-gourmet-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarVendaPdvGourmet,
	excluirVendaPdvGourmet,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarVendaPdvGourmetParametros = {
	dadosVendaPdvGourmet: NovaVendaPdvGourmet;
	idusuario: string;
};

export async function criarVendaPdvGourmetService({
	dadosVendaPdvGourmet,
	idusuario,
}: CriarVendaPdvGourmetParametros): Promise<HttpResponse<VendaPdvGourmet | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosVendaPdvGourmet.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarVendaPdvGourmet(dadosVendaPdvGourmet);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_venda_pdv_gourmet",
		idusuario,
		recurso: "venda_pdv_gourmet",
		idrecurso: registro.id,
		idempresa: dadosVendaPdvGourmet.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numeropdv: registro.numeropdv,
			idcontamesa: registro.idcontamesa,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirVendaPdvGourmet(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<VendaPdvGourmet>(registro);
}
