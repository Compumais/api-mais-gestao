import { isIndPresNfeValido } from "@/constants/ind-pres-nfe.js";
import {
	atualizarNfeConfiguracao,
	buscarNfeConfiguracaoPorEmpresa,
} from "@/repositories/nfe-configuracao-repositories.js";

type SalvarUltimaPreferenciaEmissaoNfeParametros = {
	idempresa: string;
	cfop?: string | null;
	natOp?: string | null;
	idserie?: string | null;
	indPres?: number | null;
};

export async function salvarUltimaPreferenciaEmissaoNfe({
	idempresa,
	cfop,
	natOp,
	idserie,
	indPres,
}: SalvarUltimaPreferenciaEmissaoNfeParametros): Promise<void> {
	const config = await buscarNfeConfiguracaoPorEmpresa(idempresa);
	if (!config) {
		return;
	}

	const cfopNormalizado = cfop?.replace(/\D/g, "").slice(0, 5) || null;
	const natOpNormalizada = natOp?.trim().slice(0, 60) || null;
	const idserieNormalizado = idserie?.trim() || null;
	const indPresNormalizado =
		indPres != null && isIndPresNfeValido(indPres) ? indPres : null;

	if (
		!cfopNormalizado &&
		!natOpNormalizada &&
		!idserieNormalizado &&
		indPresNormalizado == null
	) {
		return;
	}

	await atualizarNfeConfiguracao(config.id, {
		ultimacfopsaida: cfopNormalizado,
		ultimanatop: natOpNormalizada,
		ultimaidserie: idserieNormalizado,
		ultimoindpres: indPresNormalizado,
		atualizadoem: new Date().toISOString(),
	});
}
