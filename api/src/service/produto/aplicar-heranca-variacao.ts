import type { NovoProduto, Produto } from "@/model/produto-model.js";
import {
	atualizarProduto,
	atualizarTributacaoVariacoes,
	buscarProdutoPorId,
} from "@/repositories/produtos-repositories.js";

/** Tributação gravada na variação a partir do pai. O body da variação não altera estes campos. */
export const CAMPOS_TRIBUTACAO_VARIACAO = [
	"ncm",
	"idncm",
	"origem",
	"idcest",
	"cest",
	"idtaxauf",
	"tipoproduto",
	"idclassificacaofiscal",
	"idcfopentrada",
	"idcfopsaida",
	"idcfopsaidanfce",
	"idcfopsaidaexterna",
	"idcfopsaidaexternanaocontrib",
	"idcfopsaidatransfexterna",
	"idcfopsaidatransfinterna",
	"idcfopsaidadevolucaoexterna",
	"idcfopsaidadevolucaointerna",
	"idcfopentradaexterna",
	"idcfopentradatransfexterna",
	"idcfopentradatransfinterna",
	"idcfopentradadevolucaoexterna",
	"idcfopentradadevolucaointerna",
	"idcfopcontroleperda",
	"cfopvendaecf",
	"situacaotributaria",
	"situacaotributariasnentrada",
	"situacaotributariasn",
	"tributacao",
	"tributacaoespecial",
	"tributacaoespecialnfcesat",
	"tributacaosn",
	"aliquotaicmsinterna",
	"aliquotaicmsdiferencialentrada",
	"aliquotareducaoicmsnfcesat",
	"percentualreducaoicms",
	"percentualmva",
	"percentualreducaomva",
	"aliquotafcpnf",
	"modalidadeicmsst",
	"motivodesoneracaoicms",
	"motivodesoneracaonf",
	"icmsentrada",
	"icmssaida",
	"icmsstentrada",
	"cstpis",
	"cstpisentrada",
	"cstcofins",
	"cstcofinsentrada",
	"aliquotapis",
	"aliquotapisentrada",
	"aliquotacofins",
	"aliquotaconfinsentrada",
	"aliquotapisconfinssaidapreco",
	"aliquotapisconfinsentradapreco",
	"percredbasepiscofinsentrada",
	"percredbasepiscofinssaida",
	"cstipientrada",
	"cstipisaida",
	"ipi",
	"ipientrada",
	"percentualipisaida",
	"modocalculoipi",
	"modocalculoipientrada",
	"idenquadramentoipientrada",
	"idenquadramentoipisaida",
	"cstibs",
	"classtributariaibs",
	"aliquotaiibs",
	"aliquotacbs",
	"situacaoiss",
	"aliquotaiss",
	"exigibilidadeiss",
	"processoisencaoiss",
	"incentivofiscal",
	"codigomunicipalservico",
	"codigolistalc11603",
	"codigotributacaonacional",
	"codigonbs",
	"cstservico",
	"idbeneficiofiscalnf",
	"idbeneficiofiscaloperacao",
	"ultimaaliquotaicmsst",
	"ultimaaliquotafcpst",
] as const satisfies readonly (keyof Produto)[];

/** Opcionais que, vazios, copiam o pai. Código, nome, preço, barras e estoque ficam de fora. */
export const CAMPOS_HERANCA_SE_VAZIO = [
	"referencia",
	"idunidademedida",
	"idgrupo",
	"idgrupogourmet",
	"custoaquisicao",
	"observacoes",
	"fornecedor",
	"idmarca",
	"idfabricante",
	"idcomprador",
	"iat",
	"enviamobile",
	"exibircardapiodelivery",
	"espizza",
	"exportaBalanca",
	"diasValidade",
	"controlalote",
	"controlavalidade",
	"tipoimpressaogourmet",
	"iddepartamento",
	"pesavel",
	"kit",
	"opcional",
	"fatorconversao",
	"fatorconversaoalternativo",
	"fatorconversaoproducao",
	"fatorconversaounidadeetq",
	"tipofatorconversaounidadeetq",
	"decimaispreco",
	"alteraprecopdv",
	"venderpeloprecototal",
	"modocalculopreco",
	"comissao",
	"comissaoavista",
	"comissaoprazo",
	"percentualcomissaoquitacao",
	"peso",
	"endereco",
	"idplanocontas",
	"nomeecf",
] as const satisfies readonly (keyof Produto)[];

type CampoTributacao = (typeof CAMPOS_TRIBUTACAO_VARIACAO)[number];
type CampoHeranca = (typeof CAMPOS_HERANCA_SE_VAZIO)[number];

export function valorCadastroVazio(valor: unknown): boolean {
	if (valor === null || valor === undefined) return true;
	if (typeof valor === "string" && valor.trim() === "") return true;
	return false;
}

export function payloadAlteraTributacao(dados: object): boolean {
	return CAMPOS_TRIBUTACAO_VARIACAO.some((campo) => campo in dados);
}

export function extrairTributacaoProduto(
	pai: Produto,
): Pick<Produto, CampoTributacao> {
	const tributacao = {} as Pick<Produto, CampoTributacao>;
	const destino = tributacao as Record<CampoTributacao, unknown>;
	for (const campo of CAMPOS_TRIBUTACAO_VARIACAO) {
		destino[campo] = pai[campo];
	}
	return tributacao;
}

function selecionarTributacaoInformada(
	dados: Partial<NovoProduto>,
): Partial<Pick<Produto, CampoTributacao>> {
	const tributacao: Partial<Pick<Produto, CampoTributacao>> = {};
	const destino = tributacao as Record<CampoTributacao, unknown>;
	for (const campo of CAMPOS_TRIBUTACAO_VARIACAO) {
		if (campo in dados && dados[campo] !== undefined) {
			destino[campo] = dados[campo];
		}
	}
	return tributacao;
}

export function tributacaoParaPropagar(
	pai: Produto,
	dados?: Partial<NovoProduto>,
): Partial<NovoProduto> {
	const mesclada: Partial<NovoProduto> = {
		...extrairTributacaoProduto(pai),
		...(dados ? selecionarTributacaoInformada(dados) : {}),
	};
	return Object.fromEntries(
		Object.entries(mesclada).filter(([, valor]) => valor !== undefined),
	) as Partial<NovoProduto>;
}

export function aplicarHerancaVariacao<T extends Partial<NovoProduto>>(
	dados: T,
	pai: Produto,
	modo: "criar" | "atualizar",
): T {
	const resultado = { ...dados };

	for (const campo of CAMPOS_HERANCA_SE_VAZIO) {
		if (modo === "atualizar" && !(campo in dados)) continue;
		const atual = resultado[campo as CampoHeranca];
		if (valorCadastroVazio(atual)) {
			(resultado as Partial<NovoProduto>)[campo] = pai[campo] as never;
		}
	}

	Object.assign(resultado, extrairTributacaoProduto(pai));
	return resultado;
}

export async function propagarTributacaoDoPai(
	pai: Produto,
	dados?: Partial<NovoProduto>,
) {
	const tributacao = tributacaoParaPropagar(pai, dados);
	if (Object.keys(tributacao).length === 0) return;
	await atualizarTributacaoVariacoes(pai.id, tributacao);
}

export async function propagarTributacaoAposAlteracaoEmMassa(params: {
	atualizados: Produto[];
	dados: Partial<NovoProduto>;
}) {
	if (!payloadAlteraTributacao(params.dados)) return;

	const idsPaiAtualizados = new Set(
		params.atualizados
			.filter((produto) => !produto.idprodutopai)
			.map((produto) => produto.id),
	);

	for (const pai of params.atualizados) {
		if (pai.idprodutopai) continue;
		await propagarTributacaoDoPai(pai, params.dados);
	}

	for (const variacao of params.atualizados) {
		if (!variacao.idprodutopai) continue;
		if (idsPaiAtualizados.has(variacao.idprodutopai)) continue;
		const pai = await buscarProdutoPorId(variacao.idprodutopai);
		if (!pai || pai.idempresa !== variacao.idempresa) continue;
		await atualizarProduto(variacao.id, tributacaoParaPropagar(pai));
	}
}
