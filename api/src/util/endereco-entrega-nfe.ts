import type {
	DestinatarioPayloadNfe,
	EnderecoEntregaPayloadNfe,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { resolverNomeMunicipioIbge } from "@/util/resolver-nome-municipio-ibge.js";

export function normalizarEnderecoEntregaNfe(
	endereco?: Partial<EnderecoEntregaPayloadNfe> | null,
): EnderecoEntregaPayloadNfe | undefined {
	if (!endereco) return undefined;

	const logradouro = endereco.logradouro?.trim() ?? "";
	const numero = endereco.numero?.trim() ?? "";
	const bairro = endereco.bairro?.trim() ?? "";
	const municipio = endereco.municipio?.trim() ?? "";
	const uf = endereco.uf?.trim().toUpperCase() ?? "";
	const codigoMunicipio = (endereco.codigoMunicipio ?? "").replace(/\D/g, "");
	const cep = (endereco.cep ?? "").replace(/\D/g, "");
	const complemento = endereco.complemento?.trim();

	if (
		logradouro.length < 2 ||
		numero.length < 1 ||
		bairro.length < 2 ||
		municipio.length < 2 ||
		uf.length !== 2 ||
		codigoMunicipio.length !== 7 ||
		cep.length !== 8
	) {
		return undefined;
	}

	return {
		logradouro,
		numero,
		...(complemento ? { complemento } : {}),
		bairro,
		codigoMunicipio,
		municipio,
		uf,
		cep,
		...(endereco.nome?.trim() ? { nome: endereco.nome.trim() } : {}),
		...(endereco.cnpjcpf?.replace(/\D/g, "")
			? { cnpjcpf: endereco.cnpjcpf.replace(/\D/g, "") }
			: {}),
	};
}

export async function resolverEnderecoEntregaNfe(params: {
	informarManual?: boolean;
	enderecoInformado?: Partial<EnderecoEntregaPayloadNfe> | null;
	destinatario?: DestinatarioPayloadNfe | null;
}): Promise<EnderecoEntregaPayloadNfe | undefined> {
	if (params.informarManual) {
		const manual = normalizarEnderecoEntregaNfe(params.enderecoInformado);
		if (!manual) return undefined;
		return {
			...manual,
			nome: manual.nome ?? params.destinatario?.razaosocial?.trim(),
			cnpjcpf:
				manual.cnpjcpf ?? params.destinatario?.cnpjcpf?.replace(/\D/g, ""),
		};
	}

	const destinatario = params.destinatario;
	if (!destinatario) return undefined;

	const municipio =
		destinatario.cidade?.trim() ||
		(await resolverNomeMunicipioIbge(
			destinatario.codigomunicipioibge,
			destinatario.estado,
		)) ||
		"";

	return normalizarEnderecoEntregaNfe({
		logradouro: destinatario.logradouro,
		numero: destinatario.numero,
		bairro: destinatario.bairro,
		codigoMunicipio: destinatario.codigomunicipioibge,
		municipio,
		uf: destinatario.estado,
		cep: destinatario.cep,
		nome: destinatario.razaosocial,
		cnpjcpf: destinatario.cnpjcpf,
	});
}
