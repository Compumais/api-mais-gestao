import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovaVendaPdvGourmet,
	VendaPdvGourmet,
} from "@/model/venda-pdv-gourmet-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarVendaPdvGourmet,
	buscarVendaPdvGourmetPorId,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarVendaPdvGourmetParametros = {
	vendaPdvGourmetId: string;
	idusuario: string;
	dados: Partial<NovaVendaPdvGourmet>;
};

export async function atualizarVendaPdvGourmetService({
	vendaPdvGourmetId,
	idusuario,
	dados,
}: AtualizarVendaPdvGourmetParametros): Promise<
	HttpResponse<VendaPdvGourmet | null>
> {
	const registroExistente = await buscarVendaPdvGourmetPorId(vendaPdvGourmetId);

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

	const registroAtualizado = await atualizarVendaPdvGourmet(vendaPdvGourmetId, {
		...dados,
		dataalteracao: new Date().toISOString(),
	});

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_venda_pdv_gourmet",
		idusuario,
		recurso: "venda_pdv_gourmet",
		idrecurso: vendaPdvGourmetId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<VendaPdvGourmet>(registroAtualizado);
}
