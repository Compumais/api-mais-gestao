import { obterStatusPadraoPorNumero } from "@/constants/ordem-servico-status";
import type { LayoutModeloImpressaoOs } from "@/schemas/modelo-impressao-os.schema";
import type { Empresa } from "@/services/empresas.service";
import type {
	OrdemServico,
	OrdemServicoItem,
} from "@/services/ordem-servico.service";

export type DadosPreviewModeloImpressaoOs = {
	empresa?: Empresa | null;
	ordem: Partial<OrdemServico> & {
		nomecliente?: string | null;
		cnpjcpfcliente?: string | null;
	};
	itens?: OrdemServicoItem[];
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

function valorCampoOs(
	ordem: DadosPreviewModeloImpressaoOs["ordem"],
	campo: string,
): string {
	switch (campo) {
		case "codigo":
			return ordem.codigo != null ? String(ordem.codigo) : "—";
		case "status": {
			const info = obterStatusPadraoPorNumero(ordem.status ?? undefined);
			return info?.descricao ?? (ordem.status != null ? String(ordem.status) : "—");
		}
		case "dataos":
			return formatarData(ordem.dataos);
		case "agendamento":
			return formatarData(ordem.agendamento);
		case "previsaoconclusao":
			return formatarData(ordem.previsaoconclusao);
		case "orcamento":
			return ordem.orcamento === 1 ? "Sim" : "Não";
		case "nomecliente":
			return ordem.nomecliente?.trim() || "—";
		case "cnpjcpfcliente":
			return ordem.cnpjcpfcliente?.trim() || "—";
		case "marca":
			return ordem.marca?.trim() || "—";
		case "modelo":
			return ordem.modelo?.trim() || "—";
		case "placa":
			return ordem.placa?.trim() || "—";
		case "renavam":
			return ordem.renavam?.trim() || "—";
		default:
			return "—";
	}
}

function linhasCampos(
	ordem: DadosPreviewModeloImpressaoOs["ordem"],
	campos: string[] | undefined,
	padrao: string[],
	labels: Record<string, string>,
): string {
	const lista = campos?.length ? campos : padrao;
	return lista
		.map(
			(campo) =>
				`<div class="campo"><span class="rotulo">${labels[campo] ?? campo}</span><span class="valor">${valorCampoOs(ordem, campo)}</span></div>`,
		)
		.join("");
}

export function renderizarHtmlModeloImpressaoOs(
	layout: LayoutModeloImpressaoOs,
	dados: DadosPreviewModeloImpressaoOs,
): string {
	const { empresa, ordem, itens = [] } = dados;
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
					`<section class="bloco titulo"><h1>${bloco.props?.titulo?.trim() || "Ordem de Serviço"}</h1></section>`,
				);
				break;
			case "textoLivre":
				partes.push(
					`<section class="bloco texto-livre"><p>${(bloco.props?.texto ?? "").replace(/\n/g, "<br/>")}</p></section>`,
				);
				break;
			case "dadosOs":
				partes.push(`
					<section class="bloco">
						<h2>Dados da OS</h2>
						<div class="grade">
							${linhasCampos(
								ordem,
								bloco.props?.campos,
								["codigo", "status", "dataos"],
								{
									codigo: "Código",
									status: "Status",
									dataos: "Data",
									agendamento: "Agendamento",
									previsaoconclusao: "Previsão",
									orcamento: "Orçamento",
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
								ordem,
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
			case "veiculo":
				partes.push(`
					<section class="bloco">
						<h2>Veículo</h2>
						<div class="grade">
							${linhasCampos(
								ordem,
								bloco.props?.campos,
								["marca", "modelo", "placa", "renavam"],
								{
									marca: "Marca",
									modelo: "Modelo",
									placa: "Placa",
									renavam: "RENAVAM",
								},
							)}
						</div>
					</section>
				`);
				break;
			case "problema":
				partes.push(`
					<section class="bloco">
						<h2>Problema descrito</h2>
						<p>${ordem.problemadescrito?.trim() || "—"}</p>
					</section>
				`);
				break;
			case "laudo":
				partes.push(`
					<section class="bloco">
						<h2>Laudo técnico</h2>
						<p>${ordem.laudotecnico?.trim() || "—"}</p>
					</section>
				`);
				break;
			case "observacao":
				partes.push(`
					<section class="bloco">
						<h2>Observação</h2>
						<p>${ordem.observacao?.trim() || "—"}</p>
					</section>
				`);
				break;
			case "itens": {
				const linhas =
					itens.length === 0
						? `<tr><td colspan="5">Nenhum item</td></tr>`
						: itens
								.map(
									(item) => `
							<tr>
								<td>${item.codigorproduto ?? "—"}</td>
								<td>${item.nomeproduto ?? "—"}</td>
								<td class="num">${item.quantidade ?? "—"}</td>
								<td class="num">${formatarMoeda(item.preco)}</td>
								<td class="num">${formatarMoeda(item.total)}</td>
							</tr>`,
								)
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
							<div class="campo"><span class="rotulo">Produtos</span><span class="valor">${formatarMoeda(ordem.valorprodutos)}</span></div>
							<div class="campo"><span class="rotulo">Serviços</span><span class="valor">${formatarMoeda(ordem.valorservicos)}</span></div>
							<div class="campo"><span class="rotulo">Desconto</span><span class="valor">${formatarMoeda(ordem.descontosubtotal)}</span></div>
							<div class="campo total"><span class="rotulo">Total</span><span class="valor">${formatarMoeda(ordem.valor)}</span></div>
						</div>
					</section>
				`);
				break;
			case "extras": {
				const extras = Array.from({ length: 16 }, (_, i) => {
					const key = `extra${i + 1}` as keyof OrdemServico;
					const valor = ordem[key];
					if (typeof valor !== "string" || !valor.trim()) return null;
					const config = ordem.camposextras?.find(
						(c) => c.campo === `extra${i + 1}`,
					);
					return `<div class="campo"><span class="rotulo">${config?.nome ?? `Extra ${i + 1}`}</span><span class="valor">${valor}</span></div>`;
				}).filter(Boolean);
				partes.push(`
					<section class="bloco">
						<h2>Campos extras</h2>
						<div class="grade">${extras.length ? extras.join("") : "<p>—</p>"}</div>
					</section>
				`);
				break;
			}
			case "assinaturas":
				partes.push(`
					<section class="bloco assinaturas">
						<div class="assinatura"><div class="linha"></div><span>Cliente</span></div>
						<div class="assinatura"><div class="linha"></div><span>Técnico / Responsável</span></div>
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

export const CSS_MODELO_IMPRESSAO_OS = `
	.folha-os {
		font-family: Georgia, "Times New Roman", serif;
		color: #1a1a1a;
		font-size: 12px;
		line-height: 1.45;
		width: 210mm;
		min-height: 297mm;
		padding: 14mm;
		box-sizing: border-box;
		background: #fff;
	}
	.folha-os .bloco { margin-bottom: 14px; }
	.folha-os .cabecalho { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px; }
	.folha-os .empresa-nome { font-size: 18px; font-weight: 700; }
	.folha-os .empresa-meta { font-size: 11px; color: #444; }
	.folha-os .titulo h1 { font-size: 16px; margin: 0; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }
	.folha-os h2 { font-size: 12px; margin: 0 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
	.folha-os .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
	.folha-os .campo { display: flex; flex-direction: column; gap: 2px; }
	.folha-os .rotulo { font-size: 10px; color: #666; text-transform: uppercase; }
	.folha-os .valor { font-size: 12px; }
	.folha-os .totais .total .valor { font-weight: 700; font-size: 14px; }
	.folha-os table { width: 100%; border-collapse: collapse; }
	.folha-os th, .folha-os td { border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: left; font-size: 11px; }
	.folha-os th { font-size: 10px; text-transform: uppercase; color: #555; }
	.folha-os td.num, .folha-os th.num { text-align: right; }
	.folha-os .assinaturas { display: flex; justify-content: space-between; gap: 40px; margin-top: 40px; }
	.folha-os .assinatura { flex: 1; text-align: center; }
	.folha-os .assinatura .linha { border-top: 1px solid #111; margin-bottom: 6px; }
	.folha-os .rodape { margin-top: 24px; font-size: 10px; color: #666; text-align: center; border-top: 1px dashed #ccc; padding-top: 8px; }
	@media print {
		body { margin: 0; }
		.folha-os { width: auto; min-height: auto; padding: 0; box-shadow: none; }
	}
`;

export function imprimirHtmlModeloOs(htmlInterno: string, titulo: string) {
	const janela = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
	if (!janela) return false;
	janela.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
	<meta charset="utf-8" />
	<title>${titulo}</title>
	<style>${CSS_MODELO_IMPRESSAO_OS}</style>
</head>
<body>
	<div class="folha-os">${htmlInterno}</div>
	<script>
		window.onload = function () {
			window.focus();
			window.print();
		};
	</script>
</body>
</html>`);
	janela.document.close();
	return true;
}

export const DADOS_AMOSTRA_MODELO_IMPRESSAO_OS: DadosPreviewModeloImpressaoOs = {
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
	ordem: {
		id: "amostra",
		idempresa: "amostra",
		codigo: 1234,
		status: 1,
		nomecliente: "Cliente Demonstração",
		cnpjcpfcliente: "123.456.789-00",
		dataos: new Date().toISOString(),
		agendamento: new Date().toISOString(),
		previsaoconclusao: new Date().toISOString(),
		problemadescrito: "Equipamento não liga após queda de energia.",
		laudotecnico: "Fonte danificada. Substituição realizada.",
		observacao: "Garantia de 90 dias no serviço.",
		marca: "Genérica",
		modelo: "X100",
		placa: "ABC1D23",
		renavam: "12345678901",
		valor: "450.00",
		valorprodutos: "200.00",
		valorservicos: "250.00",
		descontosubtotal: "0",
		orcamento: 0,
	},
	itens: [
		{
			id: "1",
			idempresa: "amostra",
			idordemservico: "amostra",
			idproduto: null,
			nomeproduto: "Fonte 500W",
			codigorproduto: "P001",
			quantidade: "1",
			preco: "200.00",
			total: "200.00",
			idtecnico: null,
			idcfop: null,
			unidademedida: "UN",
			observacao: null,
			contador: 1,
			cancelado: 0,
		},
		{
			id: "2",
			idempresa: "amostra",
			idordemservico: "amostra",
			idproduto: null,
			nomeproduto: "Mão de obra",
			codigorproduto: "S001",
			quantidade: "1",
			preco: "250.00",
			total: "250.00",
			idtecnico: null,
			idcfop: null,
			unidademedida: "UN",
			observacao: null,
			contador: 2,
			cancelado: 0,
		},
	],
};
