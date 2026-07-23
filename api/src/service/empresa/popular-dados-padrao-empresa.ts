import { criarContaCorrenteCaixaPadrao } from "@/repositories/conta-corrente-repositories.js";
import { criarCfopsPadraoService } from "@/service/cfop/criar-cfops-padrao.js";
import { criarFatoresConversaoPadraoService } from "@/service/fator-conversao/criar-fatores-conversao-padrao.js";
import { criarParametrizacaoTributosPadraoService } from "@/service/parametrizacao-tributos/criar-parametrizacao-tributos-padrao.js";
import { criarPlanoContasPadraoService } from "@/service/planocontas/criar-plano-contas-padrao.js";
import { criarTaxasPadraoService } from "@/service/taxauf/criar-taxas-padrao.js";
import { criarTiposDocumentoFinanceiroPadraoService } from "@/service/tipo-documento-financeiro/criar-tipos-documento-financeiro-padrao.js";

/**
 * Popula dados padrão (plano de contas, CFOPs, taxas, parametrização de
 * tributos, tipos de documento, conta caixa e fatores) para uma empresa nova.
 * Idempotente: cada serviço ignora se a empresa já tiver registros.
 */
export async function popularDadosPadraoEmpresa(
	idempresa: string,
): Promise<void> {
	await criarPlanoContasPadraoService(idempresa);
	await criarCfopsPadraoService(idempresa);
	await criarTaxasPadraoService(idempresa);
	await criarParametrizacaoTributosPadraoService(idempresa);
	await criarTiposDocumentoFinanceiroPadraoService(idempresa);
	await criarContaCorrenteCaixaPadrao(idempresa);
	await criarFatoresConversaoPadraoService(idempresa);
}
