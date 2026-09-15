import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarPlanoContasPorId } from "@/repositories/plano-contas-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { httpBadRequest } from "@/util/http-util.js";

type RelacionamentosCfop = {
	idplanocontas?: string | null;
	idtipodocumentofinanceiro?: string | null;
	idnaturezaoperacaoinversa?: string | null;
	idnaturezanaocontribuinte?: string | null;
	idnaturezadevolucao?: string | null;
};

export async function validarRelacionamentosCfop(params: {
	idempresa: string;
	cfopIdAtual?: string;
	relacionamentos: RelacionamentosCfop;
}) {
	const { idempresa, cfopIdAtual, relacionamentos } = params;

	if (relacionamentos.idplanocontas) {
		const plano = await buscarPlanoContasPorId(relacionamentos.idplanocontas);
		if (!plano || plano.idempresa !== idempresa) {
			return httpBadRequest("Plano de contas inválido para a empresa");
		}
	}

	if (relacionamentos.idtipodocumentofinanceiro) {
		const tipo = await buscarTipoDocumentoFinanceiroPorId(
			relacionamentos.idtipodocumentofinanceiro,
		);
		if (!tipo || tipo.idempresa !== idempresa) {
			return httpBadRequest(
				"Tipo de documento financeiro inválido para a empresa",
			);
		}
	}

	const idsNatureza = [
		relacionamentos.idnaturezaoperacaoinversa,
		relacionamentos.idnaturezanaocontribuinte,
		relacionamentos.idnaturezadevolucao,
	].filter((id): id is string => Boolean(id));

	for (const idNatureza of idsNatureza) {
		if (cfopIdAtual && idNatureza === cfopIdAtual) {
			return httpBadRequest(
				"Natureza relacionada não pode ser a própria natureza",
			);
		}

		const natureza = await buscarCfopPorId(idNatureza);
		if (!natureza || natureza.idempresa !== idempresa) {
			return httpBadRequest("Natureza relacionada inválida para a empresa");
		}
	}

	return null;
}
