import type { ProdutoFormData } from "@/schemas/produtos.schema";
import type { produtosService } from "@/services/produtos.service";
import { formatarCstProduto } from "@/util/cst-produto-util";

type ProdutoDetalhe = Awaited<ReturnType<typeof produtosService.buscar>>;

export function mapProdutoToForm(
	data: ProdutoDetalhe,
): Partial<ProdutoFormData> {
	const tipo = data.tipo?.trim();
	const iat = data.iat?.trim();
	const ippt = data.ippt?.trim();

	return {
		codigo: data.codigo ?? undefined,
		ean: data.ean,
		referencia: data.referencia,
		nome: data.nome,
		idunidademedida: data.idunidademedida ?? "",
		fornecedor: data.fornecedor,
		idgrupo: data.idgrupo ?? "",
		idgrupogourmet: data.idgrupogourmet || "none",
		espizza: data.espizza === 1,
		exibircardapiodelivery: data.exibircardapiodelivery === 1,
		exportaBalanca: data.exportaBalanca === 1,
		controlalote: data.controlalote === 1,
		controlavalidade: data.controlavalidade === 1,
		diasValidade: data.diasValidade ?? 0,
		preco: data.preco ?? "",
		custoaquisicao: data.custoaquisicao ?? "",
		tipo: tipo === "P" || tipo === "S" ? tipo : "P",
		iat: iat === "A" || iat === "T" ? iat : null,
		ippt: ippt === "P" || ippt === "T" ? ippt : "P",
		origem: data.origem ?? 0,
		ncm: data.ncm ?? "",
		tipoproduto: data.tipoproduto ?? null,
		idcfopentrada: data.idcfopentrada ?? null,
		idcfopsaida: data.idcfopsaida ?? null,
		idcfopsaidanfce: data.idcfopsaidanfce ?? null,
		idcest: data.idcest ?? null,
		idtaxauf: data.idtaxauf ?? null,
		situacaotributariasnentrada: data.situacaotributariasnentrada ?? null,
		situacaotributaria: data.situacaotributaria ?? null,
		situacaotributariasn: data.situacaotributariasn ?? null,
		tributacaoespecial: data.tributacaoespecial ?? null,
		tributacaosn: data.tributacaosn ?? null,
		cstpisentrada: formatarCstProduto(data.cstpisentrada) || null,
		cstcofinsentrada: formatarCstProduto(data.cstcofinsentrada) || null,
		cstpis: formatarCstProduto(data.cstpis) || null,
		cstcofins: formatarCstProduto(data.cstcofins) || null,
		cstipientrada: data.cstipientrada ?? null,
		cstipisaida: data.cstipisaida ?? null,
		cstibs: data.cstibs ?? null,
		classtributariaibs: data.classtributariaibs ?? null,
		percentualmva: data.percentualmva ?? null,
		aliquotaicmsinterna: data.aliquotaicmsinterna ?? null,
		aliquotaicmsdiferencialentrada: data.aliquotaicmsdiferencialentrada ?? null,
		aliquotareducaoicmsnfcesat: data.aliquotareducaoicmsnfcesat ?? null,
		aliquotafcpnf: data.aliquotafcpnf ?? null,
		ultimaaliquotaicmsst: data.ultimaaliquotaicmsst ?? null,
		ultimaaliquotafcpst: data.ultimaaliquotafcpst ?? null,
		aliquotapis: data.aliquotapis ?? null,
		aliquotapisentrada: data.aliquotapisentrada ?? null,
		aliquotacofins: data.aliquotacofins ?? null,
		aliquotaconfinsentrada: data.aliquotaconfinsentrada ?? null,
		aliquotapisconfinssaidapreco: data.aliquotapisconfinssaidapreco ?? null,
		aliquotapisconfinsentradapreco: data.aliquotapisconfinsentradapreco ?? null,
		aliquotaiss: data.aliquotaiss ?? null,
		aliquotaiibs: data.aliquotaiibs ?? null,
		aliquotacbs: data.aliquotacbs ?? null,
		observacoes: data.observacoes,
		enviamobile: data.enviamobile === 1,
		quantidadepadrao: data.quantidadepadrao ?? 0,
		quantidademinima: data.quantidademinima ?? null,
		quantidademaxima: data.quantidademaxima ?? null,
	};
}

/** Clone: copia cadastro; nome, preço, quantidades e código ficam em branco (código recebe o próximo). */
export function mapProdutoParaClone(
	data: ProdutoDetalhe,
): Partial<ProdutoFormData> {
	return {
		...mapProdutoToForm(data),
		codigo: undefined,
		nome: "",
		preco: "",
		quantidadepadrao: null,
		quantidademinima: null,
		quantidademaxima: null,
	};
}
