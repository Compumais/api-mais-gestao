import {
	atualizarNfeConfiguracao,
	buscarNfeConfiguracaoPorEmpresa,
} from "@/repositories/nfe-configuracao-repositories.js";

type SalvarUltimaPreferenciaEmissaoNfeParametros = {
	idempresa: string;
	cfop?: string | null;
	natOp?: string | null;
	idserie?: string | null;
};

export async function salvarUltimaPreferenciaEmissaoNfe({
	idempresa,
	cfop,
	natOp,
	idserie,
}: SalvarUltimaPreferenciaEmissaoNfeParametros): Promise<void> {
	const config = await buscarNfeConfiguracaoPorEmpresa(idempresa);
	if (!config) {
		return;
	}

	const cfopNormalizado = cfop?.replace(/\D/g, "").slice(0, 5) || null;
	const natOpNormalizada = natOp?.trim().slice(0, 60) || null;
	const idserieNormalizado = idserie?.trim() || null;

	if (!cfopNormalizado && !natOpNormalizada && !idserieNormalizado) {
		return;
	}

	await atualizarNfeConfiguracao(config.id, {
		ultimacfopsaida: cfopNormalizado,
		ultimanatop: natOpNormalizada,
		ultimaidserie: idserieNormalizado,
		atualizadoem: new Date().toISOString(),
	});
}
