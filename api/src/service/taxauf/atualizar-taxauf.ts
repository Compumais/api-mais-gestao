import { v4 as uuidv4 } from "uuid";
import type { TaxaUf } from "@/model/taxauf-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarTaxaUf,
	buscarTaxaUfDuplicada,
	buscarTaxaUfPorId,
	type NovaTaxaUf,
} from "@/repositories/taxauf-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import type { TaxaUfBody } from "@/util/taxauf-body-schema.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";
import type { AtualizacaoParcial } from "@/util/type-util.js";

type AtualizarTaxaUfParametros = {
	id: string;
	idusuario: string;
	idempresa: string;
	dados: AtualizacaoParcial<Omit<TaxaUfBody, "idempresa">>;
};

export async function atualizarTaxaUfService({
	id,
	idusuario,
	idempresa,
	dados,
}: AtualizarTaxaUfParametros): Promise<HttpResponse<TaxaUf | null>> {
	const registroExistente = await buscarTaxaUfPorId(id);

	if (!registroExistente || registroExistente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (dados.codigo) {
		const duplicado = await buscarTaxaUfDuplicada(
			idempresa,
			dados.codigo,
			id,
		);

		if (duplicado) {
			return httpRecursoExistente();
		}
	}

	const payload: Partial<NovaTaxaUf> = {
		...dados,
		...(dados.codigo
			? { codigo: dados.codigo.trim().toUpperCase() }
			: undefined),
	};

	const registroAtualizado = await atualizarTaxaUf(id, payload);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_taxauf",
		idusuario,
		recurso: "taxauf",
		idrecurso: id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
		},
	});

	return httpOk<TaxaUf>(registroAtualizado);
}
