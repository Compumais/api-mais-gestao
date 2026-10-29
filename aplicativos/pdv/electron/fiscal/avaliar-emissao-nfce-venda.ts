import { getConfig, setConfig } from "../db/database";
import { totaisParaSync } from "../db/pagamento";
import { obterVenda } from "../db/repos";
import {
	avaliarEmissaoNfcePorPagamento,
	CHAVE_CONFIG_MEIOS_NFCE,
	type MeiosPagamentoNfceConfig,
	parseMeiosPagamentoNfceConfig,
	resumoPagamentoParaNfce,
	serializarMeiosPagamentoNfceConfig,
} from "./meios-pagamento-nfce";

export async function lerMeiosPagamentoNfceConfig(): Promise<MeiosPagamentoNfceConfig> {
	return parseMeiosPagamentoNfceConfig(
		await getConfig(CHAVE_CONFIG_MEIOS_NFCE, ""),
	);
}

export async function persistirMeiosPagamentoNfceConfig(
	valor: Partial<MeiosPagamentoNfceConfig> | null | undefined,
): Promise<void> {
	await setConfig(
		CHAVE_CONFIG_MEIOS_NFCE,
		serializarMeiosPagamentoNfceConfig(valor),
	);
}

export async function avaliarEmissaoNfceDaVenda(vendaId: string): Promise<{
	global: boolean;
	porMeio: boolean;
	deveEmitir: boolean;
}> {
	const global = (await getConfig("emitir_nfce", "1")) === "1";
	const config = await lerMeiosPagamentoNfceConfig();
	const venda = await obterVenda(vendaId);
	if (!venda) {
		return { global, porMeio: false, deveEmitir: false };
	}
	const sync = venda.pagamentos.length
		? totaisParaSync(venda.pagamentos, venda.valortroco)
		: {
				valordinheiro: venda.valordinheiro,
				valorpix: venda.valorpix,
				valorcartaocredito: 0,
				valorcartaodebito: 0,
				valorcartao: venda.valorcartao,
				valorprepago: 0,
				valortroco: venda.valortroco,
			};
	const porMeio = avaliarEmissaoNfcePorPagamento(
		resumoPagamentoParaNfce(sync),
		config,
	).deveEmitir;
	return { global, porMeio, deveEmitir: global && porMeio };
}
