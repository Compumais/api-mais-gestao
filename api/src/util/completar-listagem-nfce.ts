import { decodificarChaveNfe } from "@/util/decodificar-chave-nfe.js";
import { numeracaoInutilizacaoDaNota } from "@/util/validar-eventos-nfe.js";

export type CabecalhoListagemNfce = {
	numeronotafiscal: string | null;
	serie: string | null;
	chavenfe: string | null;
	valortotalnota: string | null;
	emissao: string | null;
	datahoraemissao: string | null;
	datainclusao: string | null;
};

export type DadosVendaListagemNfce = {
	valortotal?: string | null;
	datacriacao?: string | null;
};

export function digitosChaveNfe(chave?: string | null): string {
	return (chave ?? "").replace(/\D/g, "");
}

export function numeroFiscalPreenchido(
	valor?: string | number | null,
): boolean {
	const numero = Number(valor);
	return (
		valor != null &&
		String(valor).trim() !== "" &&
		Number.isFinite(numero) &&
		numero > 0
	);
}

export function valorMonetarioPreenchido(valor?: string | null): boolean {
	const numero = Number.parseFloat(valor ?? "");
	return Number.isFinite(numero) && numero > 0;
}

function dataEmissaoApartirAnoMesChave(anoMes: string): string | null {
	if (!/^\d{4}$/.test(anoMes)) {
		return null;
	}
	const ano = 2000 + Number(anoMes.slice(0, 2));
	const mes = anoMes.slice(2, 4);
	if (Number(mes) < 1 || Number(mes) > 12) {
		return null;
	}
	return `${ano}-${mes}-01T00:00:00-03:00`;
}

function textoOuNulo(valor?: string | null): string | null {
	const texto = valor?.trim();
	return texto ? texto : null;
}

/**
 * Completa cabeçalho vazio de NFC-e na listagem (stubs de contingência/inutilização)
 * com série/número da chave, valor da venda e data da venda ou AAMM da chave.
 */
export function completarListagemNfce<T extends CabecalhoListagemNfce>(
	nota: T,
	venda?: DadosVendaListagemNfce,
): T {
	const chave = digitosChaveNfe(nota.chavenfe);
	const decodificada = chave.length === 44 ? decodificarChaveNfe(chave) : null;
	const numeracao = numeracaoInutilizacaoDaNota({
		serie: nota.serie,
		numeronotafiscal: nota.numeronotafiscal,
		chavenfe: chave || nota.chavenfe,
	});

	const numeronotafiscal = numeroFiscalPreenchido(nota.numeronotafiscal)
		? String(Number(nota.numeronotafiscal))
		: numeracao
			? String(numeracao.numero)
			: textoOuNulo(nota.numeronotafiscal);

	const serie = numeroFiscalPreenchido(nota.serie)
		? String(Number(nota.serie))
		: numeracao
			? String(numeracao.serie)
			: textoOuNulo(nota.serie);

	const valortotalnota = valorMonetarioPreenchido(nota.valortotalnota)
		? nota.valortotalnota
		: valorMonetarioPreenchido(venda?.valortotal)
			? (venda?.valortotal ?? null)
			: nota.valortotalnota;

	const datahoraemissao =
		textoOuNulo(nota.datahoraemissao) ??
		textoOuNulo(nota.emissao) ??
		textoOuNulo(nota.datainclusao) ??
		textoOuNulo(venda?.datacriacao) ??
		(decodificada ? dataEmissaoApartirAnoMesChave(decodificada.anoMes) : null);

	const emissao =
		textoOuNulo(nota.emissao) ??
		(datahoraemissao ? datahoraemissao.slice(0, 10) : null);

	const datainclusao = textoOuNulo(nota.datainclusao) ?? datahoraemissao;

	return {
		...nota,
		numeronotafiscal,
		serie,
		valortotalnota,
		emissao,
		datahoraemissao,
		datainclusao,
		chavenfe: chave.length === 44 ? chave : nota.chavenfe,
	};
}
