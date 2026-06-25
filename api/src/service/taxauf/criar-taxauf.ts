import { v4 as uuidv4 } from "uuid";
import type { TaxaUf } from "@/model/taxauf-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarTaxaUfDuplicada,
	criarTaxaUf,
	excluirTaxaUf,
	type NovaTaxaUf,
} from "@/repositories/taxauf-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import type { TaxaUfBody } from "@/util/taxauf-body-schema.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type CriarTaxaUfParametros = {
	dados: TaxaUfBody & { id: string };
	idusuario: string;
};

export async function criarTaxaUfService({
	dados,
	idusuario,
}: CriarTaxaUfParametros): Promise<HttpResponse<TaxaUf | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const duplicado = await buscarTaxaUfDuplicada(
		dados.idempresa,
		dados.codigo,
	);

	if (duplicado) {
		return httpRecursoExistente();
	}

	const payload: NovaTaxaUf = {
		...dados,
		codigo: dados.codigo.trim().toUpperCase(),
		bcporuf: dados.bcporuf ?? "N",
		inativo: dados.inativo ?? 0,
	};

	const registro = await criarTaxaUf(payload);

	if (!registro) {
		return httpErro();
	}

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_taxauf",
		idusuario,
		recurso: "taxauf",
		idrecurso: registro.id,
		idempresa: dados.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
			descricao: registro.descricao,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirTaxaUf(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<TaxaUf>(registro);
}
