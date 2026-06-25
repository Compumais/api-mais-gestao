import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarTaxaUfPorId,
	excluirTaxaUf,
} from "@/repositories/taxauf-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirTaxaUfParametros = {
	id: string;
	idusuario: string;
	idempresa: string;
};

export async function excluirTaxaUfService({
	id,
	idusuario,
	idempresa,
}: ExcluirTaxaUfParametros): Promise<HttpResponse<null>> {
	const registro = await buscarTaxaUfPorId(id);

	if (!registro || registro.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_taxauf",
		idusuario,
		recurso: "taxauf",
		idrecurso: id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
			descricao: registro.descricao,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirTaxaUf(id);

	return httpSemConteudo();
}
