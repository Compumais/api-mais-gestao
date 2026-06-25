import { v4 as uuidv4 } from "uuid";
import type { NovaTaxaUf } from "@/repositories/taxauf-repositories.js";
import { UFS_BRASIL } from "@/util/ufs-brasil.js";
import conteudoTaxaPadrao from "../data/taxauf-padrao.json" with { type: "json" };

type TaxaPadraoJson = {
	ID_CTI: string;
	DESCRICAO: string;
	BASE_ICMS: number | null;
	BASE_ICMSFE: number | null;
	BASE_ICMS_ST: number | null;
	BASE_ISS: number | null;
	ISS: number | null;
	POR_DIF: number | null;
	BC_POR_UF: string | null;
} & Record<`UF_${string}`, number | null>;

type TaxaPadraoArquivo = {
	TB_TAXA_UF: TaxaPadraoJson[];
};

const taxasPadrao = (conteudoTaxaPadrao as TaxaPadraoArquivo).TB_TAXA_UF;

function valorNumericoParaTexto(valor?: number | null): string | null {
	if (valor === null || valor === undefined) return null;
	return String(valor);
}

export function montarTaxasPadrao(idempresa: string): NovaTaxaUf[] {
	return taxasPadrao.map((item) => {
		const registro: NovaTaxaUf = {
			id: uuidv4(),
			idempresa,
			codigo: item.ID_CTI.trim(),
			descricao: item.DESCRICAO.trim(),
			baseicms: valorNumericoParaTexto(item.BASE_ICMS),
			baseicmsfe: valorNumericoParaTexto(item.BASE_ICMSFE),
			baseicmsst: valorNumericoParaTexto(item.BASE_ICMS_ST),
			baseiss: valorNumericoParaTexto(item.BASE_ISS),
			iss: valorNumericoParaTexto(item.ISS),
			pordif: valorNumericoParaTexto(item.POR_DIF ?? 0),
			bcporuf: item.BC_POR_UF?.trim().toUpperCase() === "S" ? "S" : "N",
			inativo: 0,
		};

		for (const uf of UFS_BRASIL) {
			const chaveJson = `UF_${uf}` as keyof TaxaPadraoJson;
			const chaveRegistro = `uf_${uf.toLowerCase()}` as keyof NovaTaxaUf;
			registro[chaveRegistro] = valorNumericoParaTexto(
				item[chaveJson] as number | null,
			) as never;
		}

		return registro;
	});
}
