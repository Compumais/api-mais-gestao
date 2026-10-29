export type TemplateStatusWhatsapp =
	| "producao"
	| "saiu"
	| "retirada_pronta"
	| "entregue"
	| "cancelado";

const TEMPLATES_PADRAO: Record<TemplateStatusWhatsapp, string> = {
	producao: `Oi {nome}! 😊
Recebemos o seu pedido #{protocolo} e já estamos preparando com carinho.

{pedido}

Qualquer dúvida, é só responder esta mensagem.`,
	saiu: "{nome}, o pedido #{protocolo} saiu para entrega e já está a caminho. 🛵",
	retirada_pronta:
		"{nome}, o pedido #{protocolo} está prontinho para retirada. Pode vir buscar quando quiser. 🛍️",
	entregue:
		"Pedido #{protocolo} entregue, {nome}! Obrigado pela preferência. Volte sempre 💚",
	cancelado:
		"Oi {nome}, o pedido #{protocolo} foi cancelado. Se quiser fazer um novo, é só chamar por aqui.",
};

const CHAVES: Record<TemplateStatusWhatsapp, string> = {
	producao: "whatsapp_msg_producao",
	saiu: "whatsapp_msg_saiu",
	retirada_pronta: "whatsapp_msg_retirada_pronta",
	entregue: "whatsapp_msg_entregue",
	cancelado: "whatsapp_msg_cancelado",
};

/** Textos antigos do sistema — usados para atualizar lojas que ainda estão no padrão. */
export const TEMPLATES_WHATSAPP_LEGADOS: Array<{
	chave: string;
	antigo: string;
	novo: string;
}> = [
	{
		chave: CHAVES.producao,
		antigo:
			"Olá {nome}, recebemos seu pedido #{protocolo} e já estamos preparando.",
		novo: TEMPLATES_PADRAO.producao,
	},
	{
		chave: CHAVES.saiu,
		antigo: "Seu pedido #{protocolo} saiu para entrega.",
		novo: TEMPLATES_PADRAO.saiu,
	},
	{
		chave: CHAVES.retirada_pronta,
		antigo: "Seu pedido #{protocolo} está pronto para retirada.",
		novo: TEMPLATES_PADRAO.retirada_pronta,
	},
	{
		chave: CHAVES.entregue,
		antigo: "Pedido #{protocolo} entregue. Obrigado!",
		novo: TEMPLATES_PADRAO.entregue,
	},
	{
		chave: CHAVES.cancelado,
		antigo: "Olá {nome}, seu pedido #{protocolo} foi cancelado.",
		novo: TEMPLATES_PADRAO.cancelado,
	},
];

export type ItemCopiaPedidoWhatsapp = {
	descricao: string;
	quantidade: number;
	precototal: number;
	observacao?: string | null;
};

export type DadosCopiaPedidoWhatsapp = {
	modalidade: string;
	senha?: string | null;
	itens: ItemCopiaPedidoWhatsapp[];
	valordesconto?: number;
	valorentrega?: number;
	valortotal?: number;
	endereco?: string | null;
	bairro?: string | null;
	complemento?: string | null;
	referencia?: string | null;
	obs?: string | null;
};

export function formatarMoedaWhatsapp(valor: number): string {
	const n = Math.round((Number(valor) || 0) * 100) / 100;
	const [int, frac = "00"] = n.toFixed(2).split(".");
	const milhar = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	return `R$ ${milhar},${frac}`;
}

export function montarCopiaPedidoWhatsapp(
	dados: DadosCopiaPedidoWhatsapp,
): string {
	const senha = (dados.senha ?? "").trim();
	const tipo = dados.modalidade === "retirada" ? "Retirada" : "Delivery";
	const titulo = senha ? `*Pedido #${senha} — ${tipo}*` : `*Pedido — ${tipo}*`;
	const linhas: string[] = [titulo];

	for (const item of dados.itens) {
		const qtd = formatarQtdWhatsapp(item.quantidade);
		const nome = (item.descricao ?? "").trim() || "Item";
		linhas.push(
			`• ${qtd}x ${nome} — ${formatarMoedaWhatsapp(item.precototal)}`,
		);
		const obsItem = (item.observacao ?? "").trim();
		if (obsItem) {
			linhas.push(`  _${obsItem}_`);
		}
	}

	const extras: string[] = [];
	const desconto = Number(dados.valordesconto) || 0;
	if (desconto > 0) {
		extras.push(`Desconto: -${formatarMoedaWhatsapp(desconto)}`);
	}
	const entrega = Number(dados.valorentrega) || 0;
	if (dados.modalidade !== "retirada" && entrega > 0) {
		extras.push(`Taxa de entrega: ${formatarMoedaWhatsapp(entrega)}`);
	}
	const total = Number(dados.valortotal);
	if (Number.isFinite(total)) {
		extras.push(`*Total: ${formatarMoedaWhatsapp(total)}*`);
	}
	if (extras.length) {
		linhas.push("");
		linhas.push(...extras);
	}

	if (dados.modalidade !== "retirada") {
		const endereco = montarEnderecoWhatsapp(dados);
		if (endereco) {
			linhas.push("");
			linhas.push(`📍 ${endereco}`);
		}
	}

	const obsPedido = (dados.obs ?? "").trim();
	if (obsPedido) {
		linhas.push("");
		linhas.push(`Obs.: ${obsPedido}`);
	}

	return linhas.join("\n").trim();
}

export function montarMensagemTemplate(
	template: string,
	vars: {
		nome?: string | null;
		protocolo?: string | null;
		pedido?: string | null;
	},
): string {
	const nome = (vars.nome ?? "").trim() || "cliente";
	const protocolo = (vars.protocolo ?? "").trim() || "—";
	const pedido = (vars.pedido ?? "").trim();
	return template
		.replaceAll("{nome}", nome)
		.replaceAll("{protocolo}", protocolo)
		.replaceAll("{pedido}", pedido)
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function montarMensagemStatusWhatsapp(params: {
	template: string;
	nome?: string | null;
	protocolo?: string | null;
	copiaPedido?: string | null;
	incluirCopiaSeAusente?: boolean;
}): string {
	const temPlaceholder = params.template.includes("{pedido}");
	const copia = (params.copiaPedido ?? "").trim();
	let corpo = montarMensagemTemplate(params.template, {
		nome: params.nome,
		protocolo: params.protocolo,
		pedido: copia,
	});
	if (!temPlaceholder && params.incluirCopiaSeAusente && copia) {
		corpo = `${corpo}\n\n${copia}`;
	}
	return corpo.trim();
}

function formatarQtdWhatsapp(quantidade: number): string {
	const n = Number(quantidade) || 0;
	if (Number.isInteger(n)) return String(n);
	return String(n).replace(".", ",");
}

function montarEnderecoWhatsapp(dados: DadosCopiaPedidoWhatsapp): string {
	const partes = [
		(dados.endereco ?? "").trim(),
		(dados.bairro ?? "").trim(),
		(dados.complemento ?? "").trim(),
	].filter(Boolean);
	const referencia = (dados.referencia ?? "").trim();
	let texto = partes.join(" — ");
	if (referencia) {
		texto = texto ? `${texto} (Ref.: ${referencia})` : `Ref.: ${referencia}`;
	}
	return texto;
}

export { TEMPLATES_PADRAO, CHAVES as CHAVES_TEMPLATE_WHATSAPP };
