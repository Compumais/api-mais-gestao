import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";

const NAT_OP_PADRAO = "VENDA";

export async function resolverNatOpEmissaoNfe({
	idempresa,
	natOp,
	cfopItem,
}: {
	idempresa: string;
	natOp?: string | null;
	cfopItem?: string | null;
}): Promise<string> {
	const natOpInformada = natOp?.trim();
	if (natOpInformada) {
		return natOpInformada.slice(0, 60);
	}

	const codigoCfop = cfopItem?.replace(/\D/g, "");
	if (codigoCfop) {
		const cfop = await buscarCfopPorCodigo(idempresa, codigoCfop);
		const descricao =
			cfop?.descricao?.trim() || cfop?.descricaocompleta?.trim();
		if (descricao) {
			return descricao.slice(0, 60);
		}
		return `Venda CFOP ${codigoCfop}`.slice(0, 60);
	}

	return NAT_OP_PADRAO;
}
