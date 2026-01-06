import { criarEmpresa, type NovaEmpresa } from "../../models/empresa-model";

export async function criarEmpresaService(dadosEmpresa: NovaEmpresa) {
	const empresa = await criarEmpresa(dadosEmpresa);

	if (!empresa) {
		throw new Error("Erro ao criar empresa");
	}

	return empresa;
}
