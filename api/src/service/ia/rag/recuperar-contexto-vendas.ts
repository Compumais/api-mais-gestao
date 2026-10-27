import { listarNotasRelatorioFiscalVendas } from "@/repositories/nota-fiscal-repositories.js";
import type { PeriodoVendas } from "@/service/ia/pergunta-vendas-periodo.js";
import {
	type ContextoVendasParseado,
	parsearNotasVendas,
} from "@/service/ia/rag/parsear-contexto-vendas.js";

export async function recuperarContextoVendas(params: {
	idempresa: string;
	periodo: PeriodoVendas;
}): Promise<ContextoVendasParseado> {
	const notas = await listarNotasRelatorioFiscalVendas({
		idempresa: params.idempresa,
		dataInicio: params.periodo.dataInicio,
		dataFim: params.periodo.dataFim,
	});
	return parsearNotasVendas(notas, params.periodo);
}
