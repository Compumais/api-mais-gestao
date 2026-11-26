export type LinhaRecebivelCielo = {
	linhacsv: number;
	datapagamento: string | null;
	datalancamento: string | null;
	dataprevistapagamento: string | null;
	datavenda: string | null;
	estabelecimento: string | null;
	tipolancamento: string | null;
	formapagamento: string | null;
	bandeira: string | null;
	valorbruto: string | null;
	valortaxa: string | null;
	valorliquido: string | null;
	statuspagamento: string | null;
	descricao: string | null;
	codigoautorizacao: string | null;
	nsu: string | null;
	codigovenda: string | null;
	tid: string | null;
	numerocartao: string | null;
	numeropedido: string | null;
	parcela: number | null;
	totalparcelas: number | null;
	modalidade: string | null;
};

export type ArquivoRecebivelCielo = {
	estabelecimento: string | null;
	periodoinicio: string | null;
	periodofim: string | null;
	qtdlancamentos: number;
	valorbruto: string;
	valortaxa: string;
	valorliquido: string;
	itens: LinhaRecebivelCielo[];
};

const CABECALHO_DADOS =
	"Data de pagamento;Data do lançamento;Data prevista do pagamento;Estabelecimento";

function limparCelula(valor: string | undefined) {
	const texto = (valor ?? "").trim().replace(/^"|"$/g, "").trim();
	if (!texto || texto === "\\N") return null;
	return texto;
}

function normalizarCabecalho(valor: string) {
	return valor
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function dataBrParaIso(valor: string | null) {
	if (!valor) return null;
	const match = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!match) return null;
	return `${match[3]}-${match[2]}-${match[1]}`;
}

function moedaBrParaNumero(valor: string | null) {
	if (!valor) return null;
	const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
	if (!limpo || Number.isNaN(Number(limpo))) return null;
	return Number(limpo).toFixed(2);
}

function extrairPeriodo(texto: string) {
	const match = texto.match(
		/Data de pagamento:\s*(\d{2}\/\d{2}\/\d{4})\s*à\s*(\d{2}\/\d{2}\/\d{4})/i,
	);
	if (!match) return { inicio: null, fim: null };
	return {
		inicio: dataBrParaIso(match[1] ?? null),
		fim: dataBrParaIso(match[2] ?? null),
	};
}

function extrairParcelas(forma: string | null) {
	if (!forma) return { parcela: null, totalparcelas: null };
	const match = forma.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
	if (!match) {
		if (/à vista|a vista/i.test(forma)) return { parcela: 1, totalparcelas: 1 };
		return { parcela: null, totalparcelas: null };
	}
	return {
		parcela: Number(match[1]),
		totalparcelas: Number(match[2]),
	};
}

function dividirLinhaCsv(linha: string) {
	const partes: string[] = [];
	let atual = "";
	let emAspas = false;
	for (let i = 0; i < linha.length; i += 1) {
		const char = linha[i];
		if (char === '"') {
			emAspas = !emAspas;
			continue;
		}
		if (char === ";" && !emAspas) {
			partes.push(atual);
			atual = "";
			continue;
		}
		atual += char;
	}
	partes.push(atual);
	return partes;
}

export function parseArquivoRecebiveisCielo(conteudo: string): ArquivoRecebivelCielo {
	const linhas = conteudo
		.replace(/^\uFEFF/, "")
		.split(/\r?\n/)
		.map((linha) => linha.trimEnd())
		.filter((linha) => linha.length > 0);

	let estabelecimento: string | null = null;
	let periodoinicio: string | null = null;
	let periodofim: string | null = null;
	let indiceCabecalho = -1;
	let totalizadorLido = false;
	let qtdlancamentos = 0;
	let valorbruto = "0.00";
	let valortaxa = "0.00";
	let valorliquido = "0.00";

	for (let i = 0; i < linhas.length; i += 1) {
		const linha = linhas[i] ?? "";
		if (linha.startsWith("Estabelecimento:")) {
			estabelecimento = limparCelula(linha.split(":")[1]);
		}
		if (linha.startsWith("Data de pagamento:")) {
			const periodo = extrairPeriodo(linha);
			periodoinicio = periodo.inicio;
			periodofim = periodo.fim;
		}
		if (linha.startsWith("Quantidade de lançamentos;")) {
			totalizadorLido = true;
			continue;
		}
		if (totalizadorLido && !linha.startsWith("Data de pagamento;")) {
			const cols = dividirLinhaCsv(linha);
			qtdlancamentos = Number(cols[0] ?? 0) || 0;
			valorbruto = moedaBrParaNumero(limparCelula(cols[1])) ?? "0.00";
			valortaxa = moedaBrParaNumero(limparCelula(cols[2])) ?? "0.00";
			valorliquido = moedaBrParaNumero(limparCelula(cols[3])) ?? "0.00";
			totalizadorLido = false;
			continue;
		}
		if (linha.startsWith(CABECALHO_DADOS) || linha.startsWith("Data de pagamento;Data do")) {
			indiceCabecalho = i;
			break;
		}
	}

	if (indiceCabecalho < 0) {
		throw new Error(
			"Cabeçalho do relatório Cielo não encontrado. Use o CSV 'Recebíveis Detalhado - Lançamentos'.",
		);
	}

	const cabecalho = dividirLinhaCsv(linhas[indiceCabecalho] ?? "").map((c) =>
		normalizarCabecalho(c),
	);
	const indice = (nome: string, fallback = -1) => {
		const alvo = normalizarCabecalho(nome);
		const encontrado = cabecalho.indexOf(alvo);
		return encontrado >= 0 ? encontrado : fallback;
	};

	// Fallback posicional do layout Cielo "Recebíveis Detalhado - Lançamentos"
	const idx = {
		datapagamento: indice("Data de pagamento", 0),
		datalancamento: indice("Data do lançamento", 1),
		dataprevista: indice("Data prevista do pagamento", 2),
		estabelecimento: indice("Estabelecimento", 3),
		tipolancamento: indice("Tipo de lançamento", 4),
		formapagamento: indice("Forma de pagamento", 5),
		bandeira: indice("Bandeira", 6),
		valorbruto: indice("Valor bruto", 7),
		valortaxa: indice("Valor Taxa/Tarifa", 8),
		valorliquido: indice("Valor líquido", 9),
		statuspagamento: indice("Status de pagamento", 10),
		descricao: indice("Descrição", 11),
		datavenda: indice("Data da venda", 12),
		autorizacao: indice("Código de autorização", 13),
		nsu: indice("NSU/DOC", 14),
		codigovenda: indice("Código da venda", 15),
		tid: indice("TID", 17),
		cartao: indice("Número do cartão", 21),
		pedido: indice("Número do pedido", 22),
		modalidade: indice("Modalidade", 25),
	};

	const itens: LinhaRecebivelCielo[] = [];
	for (let i = indiceCabecalho + 1; i < linhas.length; i += 1) {
		const cols = dividirLinhaCsv(linhas[i] ?? "");
		if (cols.length < 8) continue;
		const forma = limparCelula(cols[idx.formapagamento]);
		const parcelas = extrairParcelas(forma);
		itens.push({
			linhacsv: i + 1,
			datapagamento: dataBrParaIso(limparCelula(cols[idx.datapagamento])),
			datalancamento: dataBrParaIso(limparCelula(cols[idx.datalancamento])),
			dataprevistapagamento: dataBrParaIso(limparCelula(cols[idx.dataprevista])),
			datavenda: dataBrParaIso(limparCelula(cols[idx.datavenda])),
			estabelecimento: limparCelula(cols[idx.estabelecimento]),
			tipolancamento: limparCelula(cols[idx.tipolancamento]),
			formapagamento: forma,
			bandeira: limparCelula(cols[idx.bandeira]),
			valorbruto: moedaBrParaNumero(limparCelula(cols[idx.valorbruto])),
			valortaxa: moedaBrParaNumero(limparCelula(cols[idx.valortaxa])),
			valorliquido: moedaBrParaNumero(limparCelula(cols[idx.valorliquido])),
			statuspagamento: limparCelula(cols[idx.statuspagamento]),
			descricao: limparCelula(cols[idx.descricao]),
			codigoautorizacao: limparCelula(cols[idx.autorizacao]),
			nsu: limparCelula(cols[idx.nsu]),
			codigovenda: limparCelula(cols[idx.codigovenda]),
			tid: limparCelula(cols[idx.tid]),
			numerocartao: limparCelula(cols[idx.cartao]),
			numeropedido: limparCelula(cols[idx.pedido]),
			parcela: parcelas.parcela,
			totalparcelas: parcelas.totalparcelas,
			modalidade: limparCelula(cols[idx.modalidade]),
		});
	}

	if (itens.length === 0) {
		throw new Error("Nenhum lançamento encontrado no CSV da Cielo");
	}

	return {
		estabelecimento,
		periodoinicio,
		periodofim,
		qtdlancamentos: qtdlancamentos || itens.length,
		valorbruto,
		valortaxa,
		valorliquido,
		itens,
	};
}
