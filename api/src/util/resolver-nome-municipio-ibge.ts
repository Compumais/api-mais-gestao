import { buscarEstadoPorSigla } from "@/constants/estados-brasil.js";
import { buscarMunicipiosBrasilApi } from "@/service/localidade/brasil-api-client.js";

/**
 * Resolve o nome do município (xMun) a partir do código IBGE (cMun) e UF.
 * Retorna undefined se não for possível resolver.
 */
export async function resolverNomeMunicipioIbge(
	codigoIbge?: string | null,
	uf?: string | null,
): Promise<string | undefined> {
	const codigo = codigoIbge?.replace(/\D/g, "");
	const sigla = uf?.trim().toUpperCase();
	if (!codigo || codigo.length !== 7 || !sigla) {
		return undefined;
	}

	const estado = buscarEstadoPorSigla(sigla);
	if (!estado) {
		return undefined;
	}

	try {
		const municipios = await buscarMunicipiosBrasilApi(estado.idestado);
		const encontrado = municipios.find(
			(municipio) => municipio.codigo_ibge.replace(/\D/g, "") === codigo,
		);
		return encontrado?.nome?.trim() || undefined;
	} catch (erro) {
		console.error("Falha ao resolver nome do município IBGE:", erro);
		return undefined;
	}
}
