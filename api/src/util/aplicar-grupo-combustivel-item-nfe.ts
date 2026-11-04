import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	cfopExigeGrupoCombustivel,
	normalizarCfop,
	normalizarCodigoAnp,
} from "@/util/cfop-combustivel.js";

export type CombustivelItemNfe = {
	cProdANP: string;
	descANP: string;
	UFCons: string;
	pBio?: number;
};

function descricaoAnpDoItem(item: ItemPayloadNfe): string | null {
	const informada = item.descricaoAnp?.trim();
	const base = informada || item.descricao.trim();
	const texto = base.replace(/\s+/g, " ").trim().slice(0, 95);
	return texto.length >= 2 ? texto : null;
}

function ufConsumoValida(ufConsumo: string): string | null {
	const uf = ufConsumo.trim().toUpperCase();
	return /^[A-Z]{2}$/.test(uf) ? uf : null;
}

export function aplicarGrupoCombustivelItens(
	itens: ItemPayloadNfe[],
	ufConsumo: string,
): { itens: ItemPayloadNfe[]; pendencias: string[] } {
	const pendencias: string[] = [];
	const uf = ufConsumoValida(ufConsumo);

	const itensAplicados = itens.map((item, indice) => {
		const cfop = normalizarCfop(item.cfop);
		if (!cfopExigeGrupoCombustivel(cfop)) {
			if (!item.combustivel) return item;
			const semCombustivel = { ...item };
			delete semCombustivel.combustivel;
			return semCombustivel;
		}

		const rotulo = `Item ${indice + 1} (${item.descricao || "sem descrição"})`;
		const codigoAnp = normalizarCodigoAnp(item.codigoAnp);
		const descANP = descricaoAnpDoItem(item);
		const pBio = item.percentualBiodiesel;

		if (!codigoAnp || codigoAnp.length !== 9) {
			pendencias.push(
				`${rotulo}: CFOP ${cfop} é de combustível ou lubrificante e exige o código ANP de 9 dígitos no cadastro do produto.`,
			);
		}
		if (!descANP) {
			pendencias.push(
				`${rotulo}: informe a descrição ANP do combustível (mínimo 2 caracteres).`,
			);
		}
		if (!uf) {
			pendencias.push(
				`${rotulo}: informe a UF de consumo do combustível para o CFOP ${cfop}.`,
			);
		}
		if (pBio != null && (pBio < 0 || pBio > 100)) {
			pendencias.push(
				`${rotulo}: o percentual de biodiesel (pBio) deve ficar entre 0 e 100.`,
			);
		}

		if (!codigoAnp || codigoAnp.length !== 9 || !descANP || !uf) {
			return item;
		}
		if (pBio != null && (pBio < 0 || pBio > 100)) {
			return item;
		}

		const combustivel: CombustivelItemNfe = {
			cProdANP: codigoAnp,
			descANP,
			UFCons: uf,
			...(pBio != null ? { pBio: Number(pBio.toFixed(4)) } : {}),
		};

		return { ...item, combustivel };
	});

	return { itens: itensAplicados, pendencias };
}
