import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import type { HttpResponse } from "@/model/http-model.js";
import type { Produto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	CAMPOS_PRODUTOS_EXPORTACAO,
	listarTodosProdutosParaExportacao,
} from "@/repositories/produtos-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type FormatoExportacaoProdutos = "csv" | "xlsx";

type ExportarProdutosParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoExportacaoProdutos;
};

type ExportarProdutosResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
};

const ROTULOS_CAMPOS: Partial<Record<keyof Produto, string>> = {
	id: "ID",
	idempresa: "ID da empresa",
	codigo: "Código",
	ean: "EAN",
	eantributavel: "EAN tributável",
	referencia: "Referência",
	nome: "Nome",
	descricao: "Descrição",
	tipo: "Tipo",
	preco: "Preço",
	custoaquisicao: "Custo de aquisição",
	datacadastro: "Data de cadastro",
	dataalteracao: "Data de alteração",
	dataalteracaopreco: "Data de alteração do preço",
	dataultimacompra: "Data da última compra",
	idunidademedida: "ID da unidade de medida",
	unidademedida: "Unidade de medida",
	fornecedor: "Fornecedor",
	idfornecedor: "ID do fornecedor",
	idgrupo: "ID do grupo",
	idgrupogourmet: "ID do grupo gourmet",
	inativo: "Status",
	observacoes: "Observações",
	origem: "Origem da mercadoria",
	ncm: "NCM",
	idncm: "ID do NCM",
	cest: "CEST",
	idcest: "ID do CEST",
	idtaxauf: "ID da taxa por UF",
	idcfopentrada: "ID do CFOP de entrada",
	idcfopsaida: "ID do CFOP de saída",
	idcfopsaidanfce: "ID do CFOP de saída NFC-e",
	idcfopsaidaexterna: "ID do CFOP de saída externa",
	situacaotributaria: "CST ICMS de saída",
	situacaotributariasn: "CSOSN ICMS de saída",
	situacaotributariasnentrada: "CST/CSOSN ICMS de entrada",
	cstpis: "CST PIS de saída",
	cstpisentrada: "CST PIS de entrada",
	cstcofins: "CST COFINS de saída",
	cstcofinsentrada: "CST COFINS de entrada",
	cstipientrada: "CST IPI de entrada",
	cstipisaida: "CST IPI de saída",
	cstibs: "CST IBS/CBS",
	classtributariaibs: "Classificação tributária IBS/CBS",
	tributacao: "Tributação",
	tributacaoespecial: "Tributação especial",
	tributacaosn: "Tributação Simples Nacional",
	aliquotaicmsinterna: "Alíquota interna de ICMS",
	aliquotaicmsdiferencialentrada: "Alíquota diferencial de ICMS na entrada",
	aliquotareducaoicmsnfcesat: "Redução de ICMS NFC-e/SAT",
	aliquotafcpnf: "Alíquota FCP",
	percentualmva: "Percentual MVA",
	aliquotapis: "Alíquota PIS",
	aliquotacofins: "Alíquota COFINS",
	aliquotaiibs: "Alíquota IBS",
	aliquotacbs: "Alíquota CBS",
	quantidadepadrao: "Quantidade padrão",
	quantidademinima: "Quantidade mínima",
	quantidademaxima: "Quantidade máxima",
};

function obterRotulo(campo: keyof Produto): string {
	return ROTULOS_CAMPOS[campo] ?? String(campo);
}

function formatarStatus(valor: unknown): "ativo" | "inativo" {
	return valor === 1 || valor === true ? "inativo" : "ativo";
}

function normalizarValor(
	campo: keyof Produto,
	valor: unknown,
): string | number | boolean {
	if (campo === "inativo") {
		return formatarStatus(valor);
	}
	if (valor == null) return "";
	if (valor instanceof Date) return valor.toISOString();
	if (typeof valor === "object") return JSON.stringify(valor);
	if (typeof valor === "bigint") return valor.toString();
	if (
		typeof valor === "string" ||
		typeof valor === "number" ||
		typeof valor === "boolean"
	) {
		return valor;
	}
	return String(valor);
}

function campoDeveSerTexto(campo: keyof Produto): boolean {
	return /(^id|codigo|ean|ncm|cest|cst|csosn|cfop|tributacao|referencia|fci|inativo)/i.test(
		String(campo),
	);
}

function montarLinhas(
	produtos: Produto[],
): Array<Array<string | number | boolean>> {
	return produtos.map((produto) =>
		CAMPOS_PRODUTOS_EXPORTACAO.map((campo) => {
			const valor = normalizarValor(campo, produto[campo]);
			return campoDeveSerTexto(campo) && valor !== "" ? String(valor) : valor;
		}),
	);
}

function neutralizarFormulaCsv(
	valor: string | number | boolean,
): string | number | boolean {
	if (typeof valor === "string" && /^[=+\-@\t\r]/.test(valor)) {
		return `'${valor}`;
	}
	return valor;
}

function gerarCsv(linhas: Array<Array<string | number | boolean>>): Buffer {
	const cabecalho = CAMPOS_PRODUTOS_EXPORTACAO.map(obterRotulo);
	const linhasSeguras = linhas.map((linha) => linha.map(neutralizarFormulaCsv));
	const conteudo = stringify([cabecalho, ...linhasSeguras], { delimiter: ";" });
	return Buffer.from(`\uFEFF${conteudo}`, "utf-8");
}

async function gerarXlsx(
	linhas: Array<Array<string | number | boolean>>,
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const planilha = workbook.addWorksheet("Produtos");

	planilha.columns = CAMPOS_PRODUTOS_EXPORTACAO.map((campo) => {
		const header = obterRotulo(campo);
		return {
			header,
			key: String(campo),
			width: Math.min(35, Math.max(12, header.length + 2)),
		};
	});
	planilha.views = [{ state: "frozen", ySplit: 1 }];
	planilha.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: CAMPOS_PRODUTOS_EXPORTACAO.length },
	};
	planilha.getRow(1).font = { bold: true };

	for (const linha of linhas) {
		planilha.addRow(linha);
	}

	CAMPOS_PRODUTOS_EXPORTACAO.forEach((campo, indice) => {
		if (campoDeveSerTexto(campo)) {
			planilha.getColumn(indice + 1).numFmt = "@";
		}
	});

	const conteudo = await workbook.xlsx.writeBuffer();
	return Buffer.from(conteudo);
}

export async function exportarProdutosService({
	idempresa,
	idusuario,
	formato,
}: ExportarProdutosParametros): Promise<
	HttpResponse<ExportarProdutosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const produtos = await listarTodosProdutosParaExportacao(idempresa);
	const linhas = montarLinhas(produtos);

	if (formato === "xlsx") {
		return httpOk({
			content: await gerarXlsx(linhas),
			contentType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			filename: "produtos-completo.xlsx",
		});
	}

	return httpOk({
		content: gerarCsv(linhas),
		contentType: "text/csv; charset=utf-8",
		filename: "produtos-completo.csv",
	});
}
