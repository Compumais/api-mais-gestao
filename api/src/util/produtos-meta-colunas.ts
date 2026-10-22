import { getTableColumns } from "drizzle-orm";
import { produtos } from "@/repositories/schema.js";

const COLUNAS_TABELA = Object.keys(getTableColumns(produtos));

/** Colunas de estoque calculadas na listagem (não existem em `produtos`). */
export const COLUNAS_LISTAGEM_CALCULADAS = [
	"quantidade",
	"quantidadefiscal",
	"divergencia",
	"nomepai",
] as const;

export const ORDENAR_PRODUTOS_CAMPOS_LISTAGEM = [
	...COLUNAS_TABELA,
	...COLUNAS_LISTAGEM_CALCULADAS,
] as const;

export type OrdenarProdutosCampoListagem =
	(typeof ORDENAR_PRODUTOS_CAMPOS_LISTAGEM)[number];

const ROTULOS: Partial<Record<string, string>> = {
	id: "ID",
	idempresa: "Empresa",
	idprodutopai: "Produto pai",
	descricao: "Descrição",
	codigo: "Código",
	nome: "Nome",
	preco: "Preço",
	inativo: "Situação",
	ean: "EAN",
	eantributavel: "EAN tributável",
	referencia: "Referência",
	ncm: "NCM",
	unidademedida: "Unidade",
	tipoproduto: "Tipo produto",
	fornecedor: "Fornecedor",
	custoaquisicao: "Custo aquisição",
	datacadastro: "Data cadastro",
	quantidade: "Operacional",
	quantidadefiscal: "Fiscal",
	divergencia: "Divergência",
	nomepai: "Nome produto pai",
	tipo: "Tipo (P/S)",
	observacoes: "Observações",
	idunidademedida: "ID unidade medida",
	idgrupo: "Grupo",
	iddepartamento: "Departamento",
	exportaBalanca: "Exporta balança",
	controlalote: "Controla lote",
	controlavalidade: "Controla validade",
	enviamobile: "Envia mobile",
	exibircardapiodelivery: "Cardápio delivery",
};

function humanizarCampo(campo: string): string {
	if (ROTULOS[campo]) return ROTULOS[campo]!;
	return campo
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/_/g, " ")
		.replace(/^id(?=[A-Z])/i, "ID ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

const VISIVEL_PADRAO = new Set([
	"codigo",
	"nome",
	"preco",
	"inativo",
	"quantidade",
	"quantidadefiscal",
	"divergencia",
]);

export type TipoFiltroColunaProduto = "texto" | "boolean" | "data" | "divergencia";

/** Campos 0/1 exibidos e filtrados como Sim/Não (ou Ativo/Inativo em `inativo`). */
const COLUNAS_FILTRO_BOOLEAN = new Set([
	"inativo",
	"enviamobile",
	"exibircardapiodelivery",
	"espizza",
	"exportaBalanca",
	"controlalote",
	"controlavalidade",
	"itemrapido",
	"podeserbrinde",
	"pesavel",
	"kit",
	"opcional",
	"incentivofiscal",
	"funrural",
	"pedevendedor",
	"venderpeloprecototal",
	"fretegratismercadolivre",
	"alteraprecopdv",
]);

export type MetaColunaProduto = {
	id: string;
	label: string;
	origem: "banco" | "calculada";
	visivelPadrao: boolean;
	filtravel: boolean;
	ordenavel: boolean;
	tipoFiltro: TipoFiltroColunaProduto;
};

export function ehColunaFiltroBoolean(campo: string): boolean {
	return COLUNAS_FILTRO_BOOLEAN.has(campo);
}

function tipoFiltroColuna(id: string): TipoFiltroColunaProduto {
	if (id === "datacadastro") return "data";
	if (id === "divergencia") return "divergencia";
	if (COLUNAS_FILTRO_BOOLEAN.has(id)) return "boolean";
	return "texto";
}

export function listarMetaColunasProdutos(): MetaColunaProduto[] {
	const banco: MetaColunaProduto[] = COLUNAS_TABELA.map((id) => ({
		id,
		label: humanizarCampo(id),
		origem: "banco",
		visivelPadrao: VISIVEL_PADRAO.has(id),
		filtravel: id !== "id" && id !== "idempresa",
		ordenavel: true,
		tipoFiltro: tipoFiltroColuna(id),
	}));
	const calculadas: MetaColunaProduto[] = COLUNAS_LISTAGEM_CALCULADAS.map(
		(id) => ({
			id,
			label: humanizarCampo(id),
			origem: "calculada",
			visivelPadrao: VISIVEL_PADRAO.has(id),
			filtravel: true,
			ordenavel: true,
			tipoFiltro: tipoFiltroColuna(id),
		}),
	);
	return [...banco, ...calculadas];
}

export function colunaProdutoFiltravel(campo: string): boolean {
	if (campo === "id" || campo === "idempresa") return false;
	return (
		COLUNAS_TABELA.includes(campo) ||
		COLUNAS_LISTAGEM_CALCULADAS.includes(
			campo as (typeof COLUNAS_LISTAGEM_CALCULADAS)[number],
		)
	);
}

export function referenciaColunaProduto(campo: string) {
	const colunas = getTableColumns(produtos);
	if (!(campo in colunas)) return null;
	return colunas[campo as keyof typeof colunas];
}
