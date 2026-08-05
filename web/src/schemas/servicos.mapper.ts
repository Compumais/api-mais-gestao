import type { CriarProdutoData, Produto } from "@/services/produtos.service";
import type { ServicoFormData } from "./servicos.schema";

function textoOuNulo(valor: string | null | undefined): string | null {
	const texto = valor?.trim();
	return texto ? texto : null;
}

function percentualOuNulo(valor: string | null | undefined): string | null {
	const texto = valor?.trim();
	if (!texto) return null;
	const numero = Number.parseFloat(texto.replace(",", "."));
	if (Number.isNaN(numero)) return null;
	return numero.toFixed(2);
}

export function buildServicoPayload(
	data: ServicoFormData,
	idempresa: string,
): CriarProdutoData {
	return {
		idempresa,
		codigo: data.codigo,
		nome: data.nome.trim(),
		idunidademedida: data.idunidademedida,
		preco: data.preco,
		tipo: "S",
		tipoproduto: "09",
		iat: data.iat ?? "T",
		ippt: "T",
		origem: 0,
		ncm: null,
		observacoes: textoOuNulo(data.observacoes),
		enviamobile: data.enviamobile ? 1 : 0,
		itemrapido: data.itemrapido ? 1 : 0,
		podeserbrinde: data.podeserbrinde ? 1 : 0,
		inativo: data.ativo ? 0 : 1,
		nomeecf: textoOuNulo(data.nomeecf),
		decimaispreco: data.decimaispreco ?? 2,
		codigolistalc11603: textoOuNulo(data.codigolistalc11603),
		codigotributacaonacional: textoOuNulo(data.codigotributacaonacional),
		codigonbs: textoOuNulo(data.codigonbs),
		cicloposvenda: data.cicloposvenda ?? 0,
		idplanocontas: data.idplanocontas || null,
		comissao: percentualOuNulo(data.comissao),
		comissaoavista: percentualOuNulo(data.comissaoavista),
		comissaoprazo: percentualOuNulo(data.comissaoprazo),
		percentualcomissaoquitacao: percentualOuNulo(
			data.percentualcomissaoquitacao,
		),
		situacaoiss: textoOuNulo(data.situacaoiss),
		aliquotaiss: percentualOuNulo(data.aliquotaiss),
		exigibilidadeiss: data.exigibilidadeiss || "1",
		processoisencaoiss: textoOuNulo(data.processoisencaoiss),
		incentivofiscal: data.incentivofiscal ? 1 : 0,
		codigomunicipalservico: textoOuNulo(data.codigomunicipalservico),
		cstpis: textoOuNulo(data.cstpis),
		cstcofins: textoOuNulo(data.cstcofins),
		aliquotapis: percentualOuNulo(data.aliquotapis),
		aliquotacofins: percentualOuNulo(data.aliquotacofins),
		idcfopsaida: data.idcfopsaida || null,
		idcfopsaidaexterna: data.idcfopsaidaexterna || null,
		tipoimpressaogourmet: textoOuNulo(data.tipoimpressaogourmet),
	};
}

export function mapProdutoToServicoForm(
	data: Produto,
): Partial<ServicoFormData> {
	const iat = data.iat?.trim();
	return {
		codigo: data.codigo ?? undefined,
		itemrapido: data.itemrapido === 1,
		podeserbrinde: data.podeserbrinde === 1,
		ativo: data.inativo !== 1,
		nome: data.nome,
		nomeecf: data.nomeecf ?? null,
		idunidademedida: data.idunidademedida ?? "",
		preco: data.preco ?? "0.00",
		decimaispreco: data.decimaispreco ?? 2,
		iat: iat === "A" || iat === "T" ? iat : "T",
		codigolistalc11603: data.codigolistalc11603 ?? null,
		codigotributacaonacional: data.codigotributacaonacional ?? null,
		codigonbs: data.codigonbs ?? null,
		cicloposvenda: data.cicloposvenda ?? 0,
		idplanocontas: data.idplanocontas ?? null,
		comissao: data.comissao ?? "0.00",
		comissaoavista: data.comissaoavista ?? "0.00",
		comissaoprazo: data.comissaoprazo ?? "0.00",
		percentualcomissaoquitacao: data.percentualcomissaoquitacao ?? "0.00",
		observacoes: data.observacoes,
		situacaoiss: data.situacaoiss ?? null,
		aliquotaiss: data.aliquotaiss ?? "0.00",
		exigibilidadeiss: data.exigibilidadeiss ?? "1",
		processoisencaoiss: data.processoisencaoiss ?? null,
		incentivofiscal: data.incentivofiscal === 1,
		codigomunicipalservico: data.codigomunicipalservico ?? null,
		cstpis: data.cstpis != null ? String(data.cstpis) : null,
		cstcofins: data.cstcofins != null ? String(data.cstcofins) : null,
		aliquotapis: data.aliquotapis ?? "0.00",
		aliquotacofins: data.aliquotacofins ?? "0.00",
		idcfopsaida: data.idcfopsaida ?? null,
		idcfopsaidaexterna: data.idcfopsaidaexterna ?? null,
		enviamobile: data.enviamobile === 1,
		tipoimpressaogourmet: data.tipoimpressaogourmet ?? null,
	};
}
