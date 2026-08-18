import {
	corrigirQrCodeNfce,
	resolverUrlConsultaNfce,
} from "../fiscal/nfce-portais";
import type {
	ConsumidorDanfce,
	DadosDanfce,
	EmitenteDanfce,
	ItemDanfce,
} from "./danfce-xml";

export const LARGURA_DANFCE = 48;
export const MARCADOR_QR_DANFCE = "<<QR>>";

function onlyDigits(valor: string): string {
	return valor.replace(/\D/g, "");
}

export function formatarMoedaDanfce(valor: number): string {
	return valor.toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function formatarCnpjDanfce(cnpj: string): string {
	const d = onlyDigits(cnpj).padStart(14, "0").slice(-14);
	return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatarCpfDanfce(cpf: string): string {
	const d = onlyDigits(cpf).padStart(11, "0").slice(-11);
	return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function formatarChaveDanfce(chave: string): string {
	const d = onlyDigits(chave);
	if (!d) return chave;
	return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatarProtocoloDanfce(protocolo: string): string {
	const d = onlyDigits(protocolo);
	if (d.length < 15) return protocolo;
	return `${d.slice(0, 3)} ${d.slice(3, 13)} ${d.slice(13)}`;
}

export function formatarFoneDanfce(fone: string): string {
	const d = onlyDigits(fone);
	if (d.length === 11) {
		return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1)$2-$3");
	}
	if (d.length === 10) {
		return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
	}
	return fone;
}

export function formatarDataHoraDanfce(iso: string): string {
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
	if (m) {
		return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
	}
	const data = new Date(iso);
	if (Number.isNaN(data.getTime())) return iso;
	return data.toLocaleString("pt-BR");
}

export function formatarQtdeDanfce(valor: number): string {
	const arred = Math.round(valor * 10000) / 10000;
	if (Number.isInteger(arred)) return String(arred);
	return String(arred).replace(".", ",");
}

function centralizar(texto: string, largura = LARGURA_DANFCE): string[] {
	const linhas = quebrar(texto, largura);
	return linhas.map((linha) => {
		const pad = Math.max(0, largura - linha.length);
		const esquerda = Math.floor(pad / 2);
		return `${" ".repeat(esquerda)}${linha}`;
	});
}

function quebrar(texto: string, largura = LARGURA_DANFCE): string[] {
	const limpo = texto.replace(/\s+/g, " ").trim();
	if (!limpo) return [""];
	const linhas: string[] = [];
	let resto = limpo;
	while (resto.length > largura) {
		let corte = resto.lastIndexOf(" ", largura);
		if (corte < largura / 2) corte = largura;
		linhas.push(resto.slice(0, corte).trimEnd());
		resto = resto.slice(corte).trimStart();
	}
	if (resto) linhas.push(resto);
	return linhas;
}

function esquerdaDireita(
	esquerda: string,
	direita: string,
	largura = LARGURA_DANFCE,
): string {
	const gap = 1;
	const maxEsq = Math.max(0, largura - direita.length - gap);
	const esq = esquerda.slice(0, maxEsq);
	return `${esq}${" ".repeat(Math.max(gap, largura - esq.length - direita.length))}${direita}`;
}

function sep(): string {
	return "-".repeat(LARGURA_DANFCE);
}

function enderecoEmitente(emitente: EmitenteDanfce): string {
	const partes = [
		[emitente.logradouro, emitente.numero].filter(Boolean).join(", "),
		emitente.bairro,
		[emitente.municipio, emitente.uf].filter(Boolean).join("-"),
	]
		.map((p) => p?.trim())
		.filter(Boolean);
	return partes.join(", ");
}

function linhaConsumidor(consumidor?: ConsumidorDanfce): string {
	if (!consumidor?.documento && !consumidor?.nome) {
		return "CONSUMIDOR NAO IDENTIFICADO";
	}
	if (consumidor.tipo === "cnpj" && consumidor.documento) {
		const nome = consumidor.nome ? ` - ${consumidor.nome}` : "";
		return `CONSUMIDOR - CNPJ ${formatarCnpjDanfce(consumidor.documento)}${nome}`;
	}
	if (consumidor.tipo === "cpf" && consumidor.documento) {
		const nome = consumidor.nome ? ` - ${consumidor.nome}` : "";
		return `CONSUMIDOR - CPF ${formatarCpfDanfce(consumidor.documento)}${nome}`;
	}
	if (consumidor.nome) {
		return `CONSUMIDOR - ${consumidor.nome}`;
	}
	return "CONSUMIDOR NAO IDENTIFICADO";
}

function linhasItem(item: ItemDanfce): string[] {
	const codigo = (item.codigo || "").slice(0, 10);
	const desc = item.descricao || "";
	const primeira = `${codigo}${codigo ? " " : ""}${desc}`.trim();
	const linhas = quebrar(primeira);
	const qtde = formatarQtdeDanfce(item.quantidade);
	const un = (item.unidade || "UN").slice(0, 4);
	const valores = `${qtde} ${un}  ${formatarMoedaDanfce(item.unitario)}  ${formatarMoedaDanfce(item.total)}`;
	linhas.push(esquerdaDireita("", valores));
	return linhas;
}

export function montarTextoDanfce(dados: DadosDanfce): string {
	const linhas: string[] = [];
	const emit = dados.emitente;

	linhas.push(...centralizar(emit.nome || "EMITENTE"));
	const ie = emit.ie ? ` | IE: ${emit.ie}` : "";
	linhas.push(
		...centralizar(
			`CNPJ: ${emit.cnpj ? formatarCnpjDanfce(emit.cnpj) : "—"}${ie}`,
		),
	);
	const endereco = enderecoEmitente(emit);
	if (endereco) {
		linhas.push(...centralizar(endereco));
	}
	if (emit.fone) {
		linhas.push(...centralizar(`Fone: ${formatarFoneDanfce(emit.fone)}`));
	}

	linhas.push(sep());
	linhas.push(
		...centralizar(
			"Documento Auxiliar da Nota Fiscal de Consumidor Eletronica",
		),
	);
	linhas.push(...centralizar("Não permite aproveitamento de crédito de ICMS"));
	if (dados.contingencia) {
		linhas.push(...centralizar("EMITIDA EM CONTINGÊNCIA"));
		if (dados.pendenteAutorizacao) {
			linhas.push(...centralizar("Pendente de autorização"));
		}
	}
	if (dados.homologacao) {
		linhas.push(...centralizar("SEM VALOR FISCAL"));
		linhas.push(...centralizar("Emitida em ambiente de Homologacao"));
	}

	linhas.push(sep());
	linhas.push("Codigo Descricao Qtde UN Vl Unit Vl Total");
	for (const item of dados.itens) {
		linhas.push(...linhasItem(item));
	}

	linhas.push(sep());
	linhas.push(
		esquerdaDireita("Qtde total de itens", String(dados.itens.length)),
	);
	linhas.push(
		esquerdaDireita("Valor Total R$", formatarMoedaDanfce(dados.valorProdutos)),
	);
	linhas.push(
		esquerdaDireita("Desconto R$", formatarMoedaDanfce(dados.desconto)),
	);
	linhas.push(esquerdaDireita("Frete R$", formatarMoedaDanfce(dados.frete)));
	linhas.push(
		esquerdaDireita("Valor a Pagar R$", formatarMoedaDanfce(dados.valorPagar)),
	);

	linhas.push(sep());
	linhas.push(esquerdaDireita("FORMA PAGAMENTO", "VALOR PAGO R$"));
	if (dados.pagamentos.length) {
		for (const pag of dados.pagamentos) {
			linhas.push(esquerdaDireita(pag.tipo, formatarMoedaDanfce(pag.valor)));
		}
	}
	linhas.push(esquerdaDireita("Troco R$", formatarMoedaDanfce(dados.troco)));

	linhas.push(sep());
	linhas.push(...centralizar("Consulte pela Chave de Acesso em:"));
	if (dados.urlChave) {
		linhas.push(...centralizar(dados.urlChave));
	}
	if (dados.chave) {
		const grupos = formatarChaveDanfce(dados.chave).split(" ");
		if (formatarChaveDanfce(dados.chave).length <= LARGURA_DANFCE) {
			linhas.push(...centralizar(formatarChaveDanfce(dados.chave)));
		} else {
			const meio = Math.ceil(grupos.length / 2);
			linhas.push(...centralizar(grupos.slice(0, meio).join(" ")));
			linhas.push(...centralizar(grupos.slice(meio).join(" ")));
		}
	}

	linhas.push(sep());
	linhas.push(...centralizar(linhaConsumidor(dados.consumidor)));
	if (dados.consumidor?.endereco) {
		linhas.push(...centralizar(dados.consumidor.endereco));
	}
	const numero = String(dados.numero || 0).padStart(9, "0");
	const serie = String(dados.serie || 0).padStart(3, "0");
	const dhEmi = dados.dhEmi ? ` ${formatarDataHoraDanfce(dados.dhEmi)}` : "";
	linhas.push(...centralizar(`NFCe n. ${numero} Série ${serie}${dhEmi}`));
	if (dados.protocolo) {
		linhas.push(
			...centralizar(
				`Protocolo de Autorização: ${formatarProtocoloDanfce(dados.protocolo)}`,
			),
		);
	}
	if (dados.dhAutorizacao) {
		linhas.push(
			...centralizar(
				`Data de Autorização: ${formatarDataHoraDanfce(dados.dhAutorizacao)}`,
			),
		);
	}

	linhas.push(sep());
	if (dados.qrcode) {
		linhas.push(MARCADOR_QR_DANFCE);
		linhas.push(sep());
	}

	const trib =
		dados.vTotTrib != null && dados.vTotTrib > 0
			? formatarMoedaDanfce(dados.vTotTrib)
			: "------";
	linhas.push(
		...centralizar(
			`Tributos totais Incidentes (Lei Federal 12.741/2012): R$ ${trib}`,
		),
	);
	if (dados.infCpl) {
		for (const trecho of dados.infCpl.split(";")) {
			const t = trecho.trim();
			if (t) linhas.push(...quebrar(t));
		}
	}

	linhas.push("");
	linhas.push("");
	return linhas.join("\n");
}

export function juntarDadosDanfce(
	xml: Partial<DadosDanfce>,
	fallback: Partial<DadosDanfce>,
): DadosDanfce {
	const emitente: EmitenteDanfce = {
		nome: xml.emitente?.nome || fallback.emitente?.nome || "",
		cnpj: xml.emitente?.cnpj || fallback.emitente?.cnpj || "",
		ie: xml.emitente?.ie || fallback.emitente?.ie,
		logradouro: xml.emitente?.logradouro || fallback.emitente?.logradouro,
		numero: xml.emitente?.numero || fallback.emitente?.numero,
		bairro: xml.emitente?.bairro || fallback.emitente?.bairro,
		municipio: xml.emitente?.municipio || fallback.emitente?.municipio,
		uf: xml.emitente?.uf || fallback.emitente?.uf,
		fone: xml.emitente?.fone || fallback.emitente?.fone,
		crt: xml.emitente?.crt ?? fallback.emitente?.crt,
	};
	const itens = xml.itens?.length ? xml.itens : (fallback.itens ?? []);
	const pagamentos = xml.pagamentos?.length
		? xml.pagamentos
		: (fallback.pagamentos ?? []);
	const homologacao = xml.homologacao ?? fallback.homologacao ?? false;
	const chave = xml.chave || fallback.chave;
	const qrcode = corrigirQrCodeNfce({
		qrcode: xml.qrcode || fallback.qrcode,
		uf: emitente.uf,
		chave,
		homologacao,
	});
	return {
		emitente,
		homologacao,
		contingencia: xml.contingencia ?? fallback.contingencia ?? false,
		pendenteAutorizacao:
			xml.protocolo || fallback.protocolo
				? false
				: (xml.pendenteAutorizacao ?? fallback.pendenteAutorizacao ?? false),
		itens,
		valorProdutos: xml.valorProdutos ?? fallback.valorProdutos ?? 0,
		desconto: xml.desconto ?? fallback.desconto ?? 0,
		frete: xml.frete ?? fallback.frete ?? 0,
		valorPagar: xml.valorPagar ?? fallback.valorPagar ?? 0,
		pagamentos,
		troco: xml.troco || fallback.troco || 0,
		urlChave: resolverUrlConsultaNfce({
			uf: emitente.uf,
			chave,
			homologacao,
			urlXml: xml.urlChave || fallback.urlChave,
		}),
		chave,
		consumidor:
			xml.consumidor?.documento || xml.consumidor?.nome
				? xml.consumidor
				: fallback.consumidor,
		numero: xml.numero || fallback.numero || 0,
		serie: xml.serie || fallback.serie || 0,
		dhEmi: xml.dhEmi || fallback.dhEmi,
		protocolo: xml.protocolo || fallback.protocolo,
		dhAutorizacao: xml.dhAutorizacao || fallback.dhAutorizacao,
		qrcode,
		vTotTrib: xml.vTotTrib ?? fallback.vTotTrib ?? null,
		infCpl: xml.infCpl || fallback.infCpl,
	};
}
