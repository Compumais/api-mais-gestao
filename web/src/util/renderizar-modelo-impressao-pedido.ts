import { DAV_STATUS_LABELS } from "@/constants/dav-status";
import type { LayoutModeloImpressaoPedido } from "@/schemas/modelo-impressao-pedido.schema";
import type { Empresa } from "@/services/empresas.service";
import type { PedidoDav, PedidoDavItem } from "@/services/dav.service";
import {
	CSS_MODELO_IMPRESSAO_OS,
	imprimirHtmlModeloOs,
} from "@/util/renderizar-modelo-impressao-os";

export type DadosPreviewModeloImpressaoPedido = {
	empresa?: Empresa | null;
	pedido: Partial<PedidoDav> & {
		nomecliente?: string | null;
		cnpjcpfcliente?: string | null;
	};
	itens?: PedidoDavItem[];
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

function valorCampoPedido(
	pedido: DadosPreviewModeloImpressaoPedido["pedido"],
	campo: string,
): string {
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
			return pedido.nomecliente?.trim() || "—";
		case "cnpjcpfcliente":
			return pedido.cnpjcpfcliente?.trim() || "—";
		default:
			return "—";
	}
}

function linhasCampos(
	pedido: DadosPreviewModeloImpressaoPedido["pedido"],
	campos: string[] | undefined,
	padrao: string[],
	labels: Record<string, string>,
): string {
	const lista = campos?.length ? campos : padrao;
	return lista
		.map(
			(campo) =>
				`<div class="campo"><span class="rotulo">${labels[campo] ?? campo}</span><span class="valor">${valorCampoPedido(pedido, campo)}</span></div>`,
		)
		.join("");
}

export function renderizarHtmlModeloImpressaoPedido(
	layout: LayoutModeloImpressaoPedido,
	dados: DadosPreviewModeloImpressaoPedido,
): string {
	const { empresa, pedido, itens = [] } = dados;
	const partes: string[] = [];

	for (const bloco of layout) {
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
				partes.push(`
					<section class="bloco cabecalho">
						<div class="empresa-nome">${empresa?.nome ?? "Empresa"}</div>
						<div class="empresa-meta">${empresa?.cnpj ? `CNPJ: ${empresa.cnpj}` : ""}</div>
						<div class="empresa-meta">${endereco || ""}</div>
						<div class="empresa-meta">${[empresa?.telefone, empresa?.email].filter(Boolean).join(" · ")}</div>
					</section>
				`);
				break;
			}
			case "titulo":
				partes.push(
					`<section class="bloco titulo"><h1>${bloco.props?.titulo?.trim() || "Pedido"}</h1></section>`,
				);
				break;
			case "textoLivre":
				partes.push(
					`<section class="bloco texto-livre"><p>${(bloco.props?.texto ?? "").replace(/\n/g, "<br/>")}</p></section>`,
				);
				break;
			case "dadosPedido":
				partes.push(`
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
				`);
				break;
			case "cliente":
				partes.push(`
					<section class="bloco">
						<h2>Cliente</h2>
						<div class="grade">
							${linhasCampos(
								pedido,
								bloco.props?.campos,
								["nomecliente", "cnpjcpfcliente"],
								{
									nomecliente: "Nome",
									cnpjcpfcliente: "CNPJ/CPF",
								},
							)}
						</div>
					</section>
				`);
				break;
			case "observacao":
				partes.push(`
					<section class="bloco">
						<h2>Observação</h2>
						<p>${pedido.observacao?.trim() || "—"}</p>
					</section>
				`);
				break;
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
								<td>${item.codigoproduto ?? "—"}</td>
								<td>${item.nomeproduto ?? "—"}</td>
								<td class="num">${item.quantidade ?? "—"}</td>
								<td class="num">${formatarMoeda(preco)}</td>
								<td class="num">${formatarMoeda(total)}</td>
							</tr>`;
								})
								.join("");
				partes.push(`
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
				`);
				break;
			}
			case "totais":
				partes.push(`
					<section class="bloco totais">
						<h2>Totais</h2>
						<div class="grade">
							<div class="campo"><span class="rotulo">Desconto</span><span class="valor">${formatarMoeda(pedido.descontosubtotal ?? pedido.desconto)}</span></div>
							<div class="campo total"><span class="rotulo">Total</span><span class="valor">${formatarMoeda(pedido.valor)}</span></div>
						</div>
					</section>
				`);
				break;
			case "assinaturas":
				partes.push(`
					<section class="bloco assinaturas">
						<div class="assinatura"><div class="linha"></div><span>Cliente</span></div>
						<div class="assinatura"><div class="linha"></div><span>Responsável</span></div>
					</section>
				`);
				break;
			case "rodape":
				partes.push(`
					<section class="bloco rodape">
						<p>${bloco.props?.texto?.trim() || "Documento gerado pelo Mais Gestão"}</p>
					</section>
				`);
				break;
			default:
				break;
		}
	}

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
