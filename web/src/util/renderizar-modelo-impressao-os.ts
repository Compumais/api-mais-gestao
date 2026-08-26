import { obterStatusPadraoPorNumero } from "@/constants/ordem-servico-status";
import { CAMPOS_CLIENTE_OS_PADRAO } from "@/constants/modelo-impressao-os";
import type {
	BlocoModeloImpressaoOs,
	ColunaBlocoModeloImpressao,
	LayoutModeloImpressaoOs,
} from "@/schemas/modelo-impressao-os.schema";
import type { Empresa } from "@/services/empresas.service";
import type {
	OrdemServico,
	OrdemServicoItem,
} from "@/services/ordem-servico.service";

export type DadosClienteImpressao = {
	nome?: string | null;
	cnpjcpf?: string | null;
	inscricaoestadual?: string | null;
	telefone?: string | null;
	email?: string | null;
	endereco?: string | null;
	numero?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	cep?: string | null;
	cidade?: string | null;
	uf?: string | null;
};

export type DadosPreviewModeloImpressaoOs = {
	empresa?: Empresa | null;
	ordem: Partial<OrdemServico> & {
		nomecliente?: string | null;
		cnpjcpfcliente?: string | null;
	};
	itens?: (OrdemServicoItem & { nometecnico?: string | null })[];
	cliente?: DadosClienteImpressao | null;
	/** Nome do técnico responsável da OS (idultimotecnico resolvido). */
	tecnicoResponsavel?: string | null;
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

function valorCampoOs(
	ordem: DadosPreviewModeloImpressaoOs["ordem"],
	campo: string,
	cliente?: DadosClienteImpressao | null,
): string | null {
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
			return (
				cliente?.nome?.trim() ||
				ordem.nomecliente?.trim() ||
				"—"
			);
		case "cnpjcpfcliente":
			return (
				cliente?.cnpjcpf?.trim() ||
				ordem.cnpjcpfcliente?.trim() ||
				"—"
			);
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
	cliente?: DadosClienteImpressao | null,
): string {
	const lista = campos?.length ? campos : padrao;
	return lista
		.map((campo) => {
			const valor = valorCampoOs(ordem, campo, cliente);
			if (valor == null) return "";
			return `<div class="campo"><span class="rotulo">${labels[campo] ?? campo}</span><span class="valor">${escapeHtml(valor)}</span></div>`;
		})
		.filter(Boolean)
		.join("");
}

function camposClienteEfetivos(campos: string[] | undefined): string[] {
	if (!campos?.length) return [...CAMPOS_CLIENTE_OS_PADRAO];
	const soBasicos =
		campos.every((c) => c === "nomecliente" || c === "cnpjcpfcliente") &&
		campos.length <= 2;
	if (soBasicos) return [...CAMPOS_CLIENTE_OS_PADRAO];
	return campos;
}

function renderizarBlocoOs(
	bloco: BlocoModeloImpressaoOs,
	dados: DadosPreviewModeloImpressaoOs,
): string {
	const { empresa, ordem, itens = [], cliente, tecnicoResponsavel } = dados;

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
			return `<section class="bloco titulo"><h1>${escapeHtml(bloco.props?.titulo?.trim() || "Ordem de Serviço")}</h1></section>`;
		case "textoLivre":
			return `<section class="bloco texto-livre"><p>${escapeHtml(bloco.props?.texto ?? "").replace(/\n/g, "<br/>")}</p></section>`;
		case "dadosOs":
			return `
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
			`;
		case "cliente":
			return `
				<section class="bloco">
					<h2>Cliente</h2>
					<div class="grade">
						${linhasCampos(
							ordem,
							camposClienteEfetivos(bloco.props?.campos),
							[...CAMPOS_CLIENTE_OS_PADRAO],
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
		case "veiculo":
			return `
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
			`;
		case "problema":
			return `
				<section class="bloco">
					<h2>Problema descrito</h2>
					<p>${escapeHtml(ordem.problemadescrito?.trim() || "—")}</p>
				</section>
			`;
		case "laudo":
			return `
				<section class="bloco">
					<h2>Laudo técnico</h2>
					<p>${escapeHtml(ordem.laudotecnico?.trim() || "—")}</p>
				</section>
			`;
		case "servicoRealizado": {
			const servicos = itens.filter(
				(item) =>
					item.tipoproduto === "S" &&
					item.cancelado !== 1,
			);
			const linhas =
				servicos.length === 0
					? `<tr><td colspan="5">Nenhum serviço</td></tr>`
					: servicos
							.map((item) => {
								const tecnico =
									item.nometecnico?.trim() ||
									tecnicoResponsavel?.trim() ||
									"—";
								return `
							<tr>
								<td>${escapeHtml(tecnico)}</td>
								<td>${escapeHtml(item.nomeproduto ?? item.codigorproduto ?? "—")}</td>
								<td class="num">${escapeHtml(item.quantidade ?? "—")}</td>
								<td class="num">${formatarMoeda(item.preco)}</td>
								<td class="num">${formatarMoeda(item.total)}</td>
							</tr>`;
							})
							.join("");
			return `
				<section class="bloco">
					<h2>Serviços realizados</h2>
					<table>
						<thead>
							<tr>
								<th>Técnico responsável</th>
								<th>Serviço</th>
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
		case "observacao":
			return `
				<section class="bloco">
					<h2>Observação</h2>
					<p>${escapeHtml(ordem.observacao?.trim() || "—")}</p>
				</section>
			`;
		case "itens": {
			const produtos = itens.filter(
				(item) => (item.tipoproduto ?? "P") !== "S" && item.cancelado !== 1,
			);
			const linhas =
				produtos.length === 0
					? `<tr><td colspan="5">Nenhum produto</td></tr>`
					: produtos
							.map(
								(item) => `
							<tr>
								<td>${escapeHtml(item.codigorproduto ?? "—")}</td>
								<td>${escapeHtml(item.nomeproduto ?? "—")}</td>
								<td class="num">${escapeHtml(item.quantidade ?? "—")}</td>
								<td class="num">${formatarMoeda(item.preco)}</td>
								<td class="num">${formatarMoeda(item.total)}</td>
							</tr>`,
							)
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
						<div class="campo"><span class="rotulo">Produtos</span><span class="valor">${formatarMoeda(ordem.valorprodutos)}</span></div>
						<div class="campo"><span class="rotulo">Serviços</span><span class="valor">${formatarMoeda(ordem.valorservicos)}</span></div>
						<div class="campo"><span class="rotulo">Desconto</span><span class="valor">${formatarMoeda(ordem.descontosubtotal)}</span></div>
						<div class="campo total"><span class="rotulo">Total</span><span class="valor">${formatarMoeda(ordem.valor)}</span></div>
					</div>
				</section>
			`;
		case "extras": {
			const extras = Array.from({ length: 16 }, (_, i) => {
				const key = `extra${i + 1}` as keyof OrdemServico;
				const valor = ordem[key];
				if (typeof valor !== "string" || !valor.trim()) return null;
				const config = ordem.camposextras?.find(
					(c) => c.campo === `extra${i + 1}`,
				);
				return `<div class="campo"><span class="rotulo">${escapeHtml(config?.nome ?? `Extra ${i + 1}`)}</span><span class="valor">${escapeHtml(valor)}</span></div>`;
			}).filter(Boolean);
			return `
				<section class="bloco">
					<h2>Campos extras</h2>
					<div class="grade">${extras.length ? extras.join("") : "<p>—</p>"}</div>
				</section>
			`;
		}
		case "assinaturas":
			return `
				<section class="bloco assinaturas">
					<div class="assinatura"><div class="linha"></div><span>Cliente</span></div>
					<div class="assinatura"><div class="linha"></div><span>Técnico / Responsável</span></div>
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

export function renderizarHtmlModeloImpressaoOs(
	layout: LayoutModeloImpressaoOs,
	dados: DadosPreviewModeloImpressaoOs,
): string {
	const partes: string[] = [];
	let faixaCols: string[] = [];

	function flushFaixa() {
		if (faixaCols.length === 0) return;
		partes.push(`<div class="faixa-colunas">${faixaCols.join("")}</div>`);
		faixaCols = [];
	}

	for (const bloco of layout) {
		const html = renderizarBlocoOs(bloco, dados);
		if (!html) continue;
		const col = colunaEfetiva(bloco);
		if (col === "cheia") {
			flushFaixa();
			partes.push(html);
		} else {
			faixaCols.push(
				`<div class="col-bloco col-${col}">${html}</div>`,
			);
		}
	}
	flushFaixa();

	return partes.join("\n");
}

export const CSS_MODELO_IMPRESSAO_OS = `
	@page { size: A4; margin: 8mm; }
	.folha-os {
		font-family: Georgia, "Times New Roman", serif;
		color: #1a1a1a;
		font-size: 10.5px;
		line-height: 1.35;
		width: 210mm;
		min-height: 297mm;
		max-height: 297mm;
		padding: 8mm;
		box-sizing: border-box;
		background: #fff;
		overflow: hidden;
	}
	.folha-os.folha-os-preview {
		overflow: visible;
		max-height: none;
		position: relative;
	}
	.folha-os .limite-folha {
		position: absolute;
		left: 0;
		right: 0;
		top: 297mm;
		border-top: 2px dashed #e11d48;
		pointer-events: none;
		z-index: 2;
	}
	.folha-os .aviso-folha {
		position: absolute;
		left: 8mm;
		top: calc(297mm + 4px);
		font-size: 10px;
		color: #e11d48;
		font-family: system-ui, sans-serif;
	}
	.folha-os .bloco { margin-bottom: 8px; }
	.folha-os .cabecalho { border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
	.folha-os .empresa-nome { font-size: 15px; font-weight: 700; }
	.folha-os .empresa-meta { font-size: 10px; color: #444; }
	.folha-os .titulo h1 { font-size: 13px; margin: 0; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }
	.folha-os h2 { font-size: 10px; margin: 0 0 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.03em; }
	.folha-os .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; }
	.folha-os .faixa-colunas {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px 14px;
		margin-bottom: 8px;
		align-items: start;
	}
	.folha-os .faixa-colunas .bloco { margin-bottom: 0; }
	.folha-os .faixa-colunas .col-bloco.col-esquerda { grid-column: 1; }
	.folha-os .faixa-colunas .col-bloco.col-direita { grid-column: 2; }
	.folha-os .campo { display: flex; flex-direction: column; gap: 1px; }
	.folha-os .rotulo { font-size: 9px; color: #666; text-transform: uppercase; }
	.folha-os .valor { font-size: 10.5px; }
	.folha-os .campo-texto { margin-bottom: 6px; }
	.folha-os .campo-texto .rotulo { display: block; margin-bottom: 2px; }
	.folha-os .campo-texto p { margin: 0; }
	.folha-os .totais .total .valor { font-weight: 700; font-size: 12px; }
	.folha-os table { width: 100%; border-collapse: collapse; }
	.folha-os th, .folha-os td { border-bottom: 1px solid #ddd; padding: 3px 3px; text-align: left; font-size: 10px; }
	.folha-os th { font-size: 9px; text-transform: uppercase; color: #555; }
	.folha-os td.num, .folha-os th.num { text-align: right; }
	.folha-os .assinaturas { display: flex; justify-content: space-between; gap: 28px; margin-top: 24px; }
	.folha-os .assinatura { flex: 1; text-align: center; }
	.folha-os .assinatura .linha { border-top: 1px solid #111; margin-bottom: 4px; }
	.folha-os .rodape { margin-top: 12px; font-size: 9px; color: #666; text-align: center; border-top: 1px dashed #ccc; padding-top: 6px; }
	@media print {
		body { margin: 0; }
		.folha-os {
			width: auto;
			min-height: auto;
			max-height: none;
			padding: 0;
			box-shadow: none;
			overflow: visible;
		}
		.folha-os .limite-folha,
		.folha-os .aviso-folha { display: none; }
	}
`;

export function imprimirHtmlModeloOs(htmlInterno: string, titulo: string) {
	// Não usar noopener: com noopener o navegador retorna null e impede document.write,
	// mesmo com pop-ups liberados.
	const janela = window.open("", "_blank", "width=900,height=700");
	if (!janela) return false;
	janela.opener = null;
	janela.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
	<meta charset="utf-8" />
	<title>${escapeHtml(titulo)}</title>
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
	tecnicoResponsavel: "João Técnico",
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
			idempresa: "amostra",
			idordemservico: "amostra",
			idproduto: null,
			nomeproduto: "Fonte 500W",
			codigorproduto: "P001",
			quantidade: "1",
			preco: "200.00",
			total: "200.00",
			idtecnico: null,
			nometecnico: null,
			idcfop: null,
			unidademedida: "UN",
			observacao: null,
			contador: 1,
			cancelado: 0,
			tipoproduto: "P",
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
			idtecnico: "tec-1",
			nometecnico: "João Técnico",
			idcfop: null,
			unidademedida: "UN",
			observacao: null,
			contador: 2,
			cancelado: 0,
			tipoproduto: "S",
		},
	],
};
