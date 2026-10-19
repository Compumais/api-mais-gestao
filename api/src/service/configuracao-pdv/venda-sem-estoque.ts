import { buscarConfiguracaoPdvPorEmpresa } from "@/repositories/configuracao-pdv-repositories.js";

export async function empresaPermiteVendaSemEstoque(
	idempresa: string,
): Promise<boolean> {
	const configuracao = await buscarConfiguracaoPdvPorEmpresa(idempresa);
	return configuracao?.vendasemestoque === 1;
}
