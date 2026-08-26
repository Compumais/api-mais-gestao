import { DAV_STATUS_LABELS } from "@/constants/dav-status";
import { CAMPOS_CLIENTE_PEDIDO_PADRAO } from "@/constants/modelo-impressao-pedido";
import type {
	BlocoModeloImpressaoPedido,
	LayoutModeloImpressaoPedido,
} from "@/schemas/modelo-impressao-pedido.schema";
import type { ColunaBlocoModeloImpressao } from "@/schemas/modelo-impressao-os.schema";
import type { Empresa } from "@/services/empresas.service";
import type { PedidoDav, PedidoDavItem } from "@/services/dav.service";
import {
	CSS_MODELO_IMPRESSAO_OS,
	type DadosClienteImpressao,
	imprimirHtmlModeloOs,
} from "@/util/renderizar-modelo-impressao-os";

export type DadosPreviewModeloImpressaoPedido = {
	empresa?: Empresa | null;
	pedido: Partial<PedidoDav> & {
		nomecliente?: string | null;
		cnpjcpfcliente?: string | null;
	};
	itens?: PedidoDavItem[];
	cliente?: DadosClienteImpressao | null;
};

function formatarData(valor?: string | null) {
	if (!valor) return "—";
	const data = new Date(valor);
	if (Number.isNaN(data.getTime())) return valor;
	return data.toLocaleDateString("pt-BR");
}

function formatarMoeda(valor?: string | number | null) {
	if (valor == null || valor === "") return "—";
	const n = typeof valor === "number" ? valor : Number(valor);
	if (!Number.isFinite(n)) return String(valor);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(n);
}

function escapeHtml(valor: string) {
	return valor
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function colunaEfetiva(
	bloco: { coluna?: ColunaBlocoModeloImpressao },
): ColunaBlocoModeloImpressao {
	return bloco.coluna ?? "cheia";
}

function montarEnderecoCompleto(cliente?: DadosClienteImpressao | null) {
	if (!cliente) return "";
	const linha1 = [cliente.endereco, cliente.numero, cliente.complemento]
		.filter(Boolean)
		.join(", ");
	const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join("/");
	const linha2 = [cliente.bairro, cidadeUf, cliente.cep ? `CEP ${cliente.cep}` : ""]
		.filter(Boolean)
		.join(" — ");
	return [linha1, linha2].filter(Boolean).join(". ");
}

function valorCampoPedido(
	pedido: DadosPreviewModeloImpressaoPedido["pedido"],
	campo: string,
	cliente?: DadosClienteImpressao | null,
): string | null {
	switch (campo) {
		case "codigo":
			return pedido.codigo != null ? String(pedido.codigo) : "—";
		case "status": {
			if (pedido.status == null) return "—";
			return DAV_STATUS_LABELS[pedido.status] ?? String(pedido.status);
		}
		case "data":
			return formatarData(pedido.data ?? pedido.datainclusao);
		case "nomecliente":
			return cliente?.nome?.trim() || pedido.nomecliente?.trim() || "—";
		case "cnpjcpfcliente":
			return cliente?.cnpjcpf?.trim() || pedido.cnpjcpfcliente?.trim() || "—";
		case "enderecocompleto": {
			const endereco = montarEnderecoCompleto(cliente);
			return endereco || "—";
		}
		case "telefone":
			return cliente?.telefone?.trim() || "—";
		case "email":
			return cliente?.email?.trim() || "—";
		case "inscricaoestadual": {
			const ie = cliente?.inscricaoestadual?.trim();
			return ie || null;
		}
		default:
			return "—";
	}
}

function linhasCampos(
	pedido: DadosPreviewModeloImpressaoPedido["pedido"],
	campos: string[] | undefined,
	padrao: string[],
	labels: Record<string, string>,
	cliente?: DadosClienteImpressao | null,
): string {
	const lista = campos?.length ? campos : padrao;
	return lista
		.map((campo) => {
			const valor = valorCampoPedido(pedido, campo, cliente);
			if (valor == null) return "";
			return `<div class="campo"><span class="rotulo">${labels[campo] ?? campo}</span><span class="valor">${escapeHtml(valor)}</span></div>`;
		})
		.filter(Boolean)
		.join("");
}

function camposClienteEfetivos(campos: string[] | undefined): string[] {
	if (!campos?.length) return [...CAMPOS_CLIENTE_PEDIDO_PADRAO];
	const soBasicos =
		campos.every((c) => c === "nomecliente" || c === "cnpjcpfcliente") &&
		campos.length <= 2;
	if (soBasicos) return [...CAMPOS_CLIENTE_PEDIDO_PADRAO];
	return campos;
}

function renderizarBlocoPedido(
	bloco: BlocoModeloImpressaoPedido,
	dados: DadosPreviewModeloImpressaoPedido,
): string {
	const { empresa, pedido, itens = [], cliente } = dados;

	switch (bloco.tipo) {
		case "cabecalhoEmpresa": {
			const endereco = [
				empresa?.endereco,
				empresa?.numero,
				empresa?.bairro,
				empresa?.cep,
			]
				.filter(Boolean)
				.join(", ");
			return `
				<section class="bloco cabecalho">
					<div class="empresa-nome">${escapeHtml(empresa?.nome ?? "Empresa")}</div>
					<div class="empresa-meta">${empresa?.cnpj ? `CNPJ: ${escapeHtml(empresa.cnpj)}` : ""}</div>
					<div class="empresa-meta">${escapeHtml(endereco || "")}</div>
					<div class="empresa-meta">${escapeHtml([empresa?.telefone, empresa?.email].filter(Boolean).join(" · "))}</div>
				</section>
			`;
		}
		case "titulo":
			return `<section class="bloco titulo"><h1>${escapeHtml(bloco.props?.titulo?.trim() || "Pedido")}</h1></section>`;
		case "textoLivre":
			return `<section class="bloco texto-livre"><p>${escapeHtml(bloco.props?.texto ?? "").replace(/\n/g, "<br/>")}</p></section>`;
		case "dadosPedido":
			return `
				<section class="bloco">
					<h2>Dados do pedido</h2>
					<div class="grade">
						${linhasCampos(
							pedido,
							bloco.props?.campos,
							["codigo", "status", "data"],
							{
								codigo: "Código",
								status: "Status",
								data: "Data",
							},
						)}
					</div>
				</section>
			`;
		case "cliente":
			return `
				<section class="bloco">
					<h2>Cliente</h2>
					<div class="grade">
						${linhasCampos(
							pedido,
							camposClienteEfetivos(bloco.props?.campos),
							[...CAMPOS_CLIENTE_PEDIDO_PADRAO],
							{
								nomecliente: "Nome",
								cnpjcpfcliente: "CNPJ/CPF",
								enderecocompleto: "Endereço",
								telefone: "Telefone",
								email: "E-mail",
								inscricaoestadual: "IE",
							},
							cliente,
						)}
					</div>
				</section>
			`;
		case "observacao":
			return `
				<section class="bloco">
					<h2>Observação</h2>
					<p>${escapeHtml(pedido.observacao?.trim() || "—")}</p>
				</section>
			`;
		case "itens": {
			const linhas =
				itens.length === 0
					? `<tr><td colspan="5">Nenhum item</td></tr>`
					: itens
							.map((item) => {
								const qtd = parseFloat(item.quantidade ?? "0");
								const preco = parseFloat(item.preco ?? "0");
								const total =
									parseFloat(item.total ?? "0") ||
									(Number.isFinite(qtd) && Number.isFinite(preco)
										? qtd * preco
										: 0);
								return `
							<tr>
								<td>${escapeHtml(item.codigoproduto ?? "—")}</td>
								<td>${escapeHtml(item.nomeproduto ?? "—")}</td>
								<td class="num">${escapeHtml(item.quantidade ?? "—")}</td>
								<td class="num">${formatarMoeda(preco)}</td>
								<td class="num">${formatarMoeda(total)}</td>
							</tr>`;
							})
							.join("");
			return `
				<section class="bloco">
					<h2>Itens</h2>
					<table>
						<thead>
							<tr>
								<th>Código</th>
								<th>Descrição</th>
								<th>Qtd</th>
								<th>Unit.</th>
								<th>Total</th>
							</tr>
						</thead>
						<tbody>${linhas}</tbody>
					</table>
				</section>
			`;
		}
		case "totais":
			return `
				<section class="bloco totais">
					<h2>Totais</h2>
					<div class="grade">
						<div class="campo"><span class="rotulo">Desconto</span><span class="valor">${formatarMoeda(pedido.descontosubtotal ?? pedido.desconto)}</span></div>
						<div class="campo total"><span class="rotulo">Total</span><span class="valor">${formatarMoeda(pedido.valor)}</span></div>
					</div>
				</section>
			`;
		case "assinaturas":
			return `
				<section class="bloco assinaturas">
					<div class="assinatura"><div class="linha"></div><span>Cliente</span></div>
					<div class="assinatura"><div class="linha"></div><span>Responsável</span></div>
				</section>
			`;
		case "rodape":
			return `
				<section class="bloco rodape">
					<p>${escapeHtml(bloco.props?.texto?.trim() || "Documento gerado pelo Mais Gestão")}</p>
				</section>
			`;
		default:
			return "";
	}
}

export function renderizarHtmlModeloImpressaoPedido(
	layout: LayoutModeloImpressaoPedido,
	dados: DadosPreviewModeloImpressaoPedido,
): string {
	const partes: string[] = [];
	let faixaCols: string[] = [];

	function flushFaixa() {
		if (faixaCols.length === 0) return;
		partes.push(`<div class="faixa-colunas">${faixaCols.join("")}</div>`);
		faixaCols = [];
	}

	for (const bloco of layout) {
		const html = renderizarBlocoPedido(bloco, dados);
		if (!html) continue;
		const col = colunaEfetiva(bloco);
		if (col === "cheia") {
			flushFaixa();
			partes.push(html);
		} else {
			faixaCols.push(`<div class="col-bloco col-${col}">${html}</div>`);
		}
	}
	flushFaixa();

	return partes.join("\n");
}

export const CSS_MODELO_IMPRESSAO_PEDIDO = CSS_MODELO_IMPRESSAO_OS;

export function imprimirHtmlModeloPedido(htmlInterno: string, titulo: string) {
	return imprimirHtmlModeloOs(htmlInterno, titulo);
}

export const DADOS_AMOSTRA_MODELO_IMPRESSAO_PEDIDO: DadosPreviewModeloImpressaoPedido =
	{
		empresa: {
			id: "amostra",
			idproprietario: "amostra",
			nome: "Empresa Exemplo Ltda",
			cnpj: "12.345.678/0001-90",
			telefone: "(11) 3333-4444",
			email: "contato@exemplo.com",
			endereco: "Rua das Flores",
			numero: "100",
			bairro: "Centro",
			cep: "01000-000",
		},
		pedido: {
			id: "amostra",
			idempresa: "amostra",
			codigo: 128,
			status: 1,
			nomecliente: "Cliente Demonstração",
			cnpjcpfcliente: "123.456.789-00",
			data: new Date().toISOString().slice(0, 10),
			observacao: "Entregar no período da tarde.",
			valor: "450.00",
			descontosubtotal: "0",
		},
		cliente: {
			nome: "Cliente Demonstração",
			cnpjcpf: "12.345.678/0001-90",
			inscricaoestadual: "123.456.789.012",
			telefone: "(11) 98888-7777",
			email: "cliente@exemplo.com",
			endereco: "Av. Paulista",
			numero: "1000",
			complemento: "Sala 12",
			bairro: "Bela Vista",
			cep: "01310-100",
			cidade: "São Paulo",
			uf: "SP",
		},
		itens: [
			{
				id: "1",
				iddav: "amostra",
				idproduto: null,
				nomeproduto: "Produto A",
				codigoproduto: "P001",
				quantidade: "2",
				preco: "100.00",
				total: "200.00",
				unidademedida: "UN",
				idcfop: null,
			},
			{
				id: "2",
				iddav: "amostra",
				idproduto: null,
				nomeproduto: "Produto B",
				codigoproduto: "P002",
				quantidade: "1",
				preco: "250.00",
				total: "250.00",
				unidademedida: "UN",
				idcfop: null,
			},
		],
	};
