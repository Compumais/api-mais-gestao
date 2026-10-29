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

export function formatarCepDanfce(cep: string): string {
	const d = onlyDigits(cep);
	if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
	return cep;
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

function quebrarComPrefixo(
	prefixo: string,
	texto: string,
	largura = LARGURA_DANFCE,
): string[] {
	const indentLen = Math.min(prefixo.length, Math.max(0, largura - 8));
	const indent = " ".repeat(indentLen);
	const larguraPrimeira = Math.max(8, largura - prefixo.length);
	const partes = quebrar(texto, larguraPrimeira);
	if (!partes[0]) return [prefixo.trimEnd()];
	return partes.map((parte, i) =>
		i === 0 ? `${prefixo}${parte}` : `${indent}${parte}`,
	);
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

function sep(char = "-"): string {
	return char.repeat(LARGURA_DANFCE);
}

function nomeExibicao(emitente: EmitenteDanfce): string {
	return (emitente.fantasia || emitente.nome || "EMITENTE").trim();
}

function linhasEnderecoEmitente(emitente: EmitenteDanfce): string[] {
	const rua = [emitente.logradouro, emitente.numero]
		.filter(Boolean)
		.join(", ");
	const comComplemento = [rua, emitente.complemento]
		.filter(Boolean)
		.join(" - ");
	const cidade = [emitente.municipio, emitente.uf].filter(Boolean).join("/");
	const bairroCidade = [emitente.bairro, cidade].filter(Boolean).join(" - ");
	const cep = emitente.cep
		? `CEP ${formatarCepDanfce(emitente.cep)}`
		: undefined;
	const fone = emitente.fone
		? `Fone: ${formatarFoneDanfce(emitente.fone)}`
		: undefined;
	const linhas: string[] = [];
	if (comComplemento) linhas.push(...quebrar(comComplemento));
	if (bairroCidade) linhas.push(...quebrar(bairroCidade));
	if (cep) linhas.push(cep);
	if (fone) linhas.push(fone);
	return linhas;
}

function linhasConsumidor(consumidor?: ConsumidorDanfce): string[] {
	if (!consumidor?.documento && !consumidor?.nome) {
		return ["CONSUMIDOR NAO IDENTIFICADO"];
	}
	const linhas: string[] = ["CONSUMIDOR"];
	if (consumidor.tipo === "cnpj" && consumidor.documento) {
		linhas.push(`CNPJ: ${formatarCnpjDanfce(consumidor.documento)}`);
	} else if (consumidor.tipo === "cpf" && consumidor.documento) {
		linhas.push(`CPF: ${formatarCpfDanfce(consumidor.documento)}`);
	} else if (consumidor.documento) {
		linhas.push(consumidor.documento);
	}
	if (consumidor.nome) {
		linhas.push(...quebrar(consumidor.nome));
	}
	if (consumidor.endereco) {
		linhas.push(...quebrar(consumidor.endereco));
	}
	return linhas;
}

function linhasItem(item: ItemDanfce, indice: number): string[] {
	const seq = String(item.nItem ?? indice);
	const codigo = (item.codigo || "-").trim();
	const prefixo = `${seq} ${codigo} `;
	const desc = (item.descricao || "").trim() || "ITEM";
	const linhas = quebrarComPrefixo(prefixo, desc);
	const qtde = formatarQtdeDanfce(item.quantidade);
	const un = (item.unidade || "UN").slice(0, 4);
	const valores = `${qtde} ${un} x ${formatarMoedaDanfce(item.unitario)}`;
	linhas.push(esquerdaDireita(`  ${valores}`, formatarMoedaDanfce(item.total)));
	if (item.desconto && item.desconto > 0) {
		linhas.push(
			esquerdaDireita("  desc. item", `-${formatarMoedaDanfce(item.desconto)}`),
		);
	}
	return linhas;
}

function linhasChave(chave: string): string[] {
	const grupos = formatarChaveDanfce(chave).split(" ").filter(Boolean);
	if (!grupos.length) return [];
	if (formatarChaveDanfce(chave).length <= LARGURA_DANFCE) {
		return centralizar(formatarChaveDanfce(chave));
	}
	const meio = Math.ceil(grupos.length / 2);
	return [
		...centralizar(grupos.slice(0, meio).join(" ")),
		...centralizar(grupos.slice(meio).join(" ")),
	];
}

export function montarTextoDanfce(dados: DadosDanfce): string {
	const linhas: string[] = [];
	const emit = dados.emitente;
	const titulo = nomeExibicao(emit);
	const razao = emit.nome?.trim();

	linhas.push(sep("="));
	linhas.push(...centralizar(titulo));
	linhas.push(sep("="));
	if (razao && razao !== titulo) {
		linhas.push(...quebrar(razao));
	}
	if (emit.cnpj) {
		linhas.push(`CNPJ: ${formatarCnpjDanfce(emit.cnpj)}`);
	}
	if (emit.ie) {
		linhas.push(`IE: ${emit.ie}`);
	}
	linhas.push(...linhasEnderecoEmitente(emit));

	linhas.push(sep());
	linhas.push(...centralizar("DANFE NFC-e"));
	linhas.push(...centralizar("Documento Auxiliar da Nota Fiscal"));
	linhas.push(...centralizar("de Consumidor Eletronica"));
	linhas.push(...centralizar("Nao permite aproveitamento de credito de ICMS"));

	if (dados.contingencia) {
		linhas.push(sep());
		linhas.push(...centralizar("EMITIDA EM CONTINGENCIA"));
		if (dados.pendenteAutorizacao) {
			linhas.push(...centralizar("Pendente de autorizacao"));
		}
	}
	if (dados.homologacao) {
		linhas.push(sep());
		linhas.push(...centralizar("SEM VALOR FISCAL"));
		linhas.push(...centralizar("EMITIDA EM AMBIENTE DE HOMOLOGACAO"));
	}

	linhas.push(sep());
	linhas.push("# CODIGO DESCRICAO");
	linhas.push(esquerdaDireita("  QTD UN x VL UNIT", "VL ITEM"));
	linhas.push(sep());
	dados.itens.forEach((item, idx) => {
		linhas.push(...linhasItem(item, idx + 1));
	});

	linhas.push(sep());
	linhas.push(
		esquerdaDireita("Qtde total de itens", String(dados.itens.length)),
	);
	linhas.push(
		esquerdaDireita("Valor total R$", formatarMoedaDanfce(dados.valorProdutos)),
	);
	if (dados.desconto > 0) {
		linhas.push(
			esquerdaDireita("Desconto R$", formatarMoedaDanfce(dados.desconto)),
		);
	}
	if (dados.frete > 0) {
		linhas.push(esquerdaDireita("Frete R$", formatarMoedaDanfce(dados.frete)));
	}
	if (dados.seguro > 0) {
		linhas.push(
			esquerdaDireita("Seguro R$", formatarMoedaDanfce(dados.seguro)),
		);
	}
	if (dados.outras > 0) {
		linhas.push(
			esquerdaDireita("Outras despesas R$", formatarMoedaDanfce(dados.outras)),
		);
	}
	linhas.push(
		esquerdaDireita("Valor a pagar R$", formatarMoedaDanfce(dados.valorPagar)),
	);

	linhas.push(sep());
	linhas.push(esquerdaDireita("FORMA DE PAGAMENTO", "VALOR PAGO"));
	if (dados.pagamentos.length) {
		for (const pag of dados.pagamentos) {
			linhas.push(esquerdaDireita(pag.tipo, formatarMoedaDanfce(pag.valor)));
		}
	}
	linhas.push(esquerdaDireita("Troco R$", formatarMoedaDanfce(dados.troco)));

	linhas.push(sep());
	linhas.push(...centralizar("Consulte pela Chave de Acesso em"));
	if (dados.urlChave) {
		linhas.push(...centralizar(dados.urlChave));
	}
	if (dados.chave) {
		linhas.push(...linhasChave(dados.chave));
	}

	linhas.push(sep());
	linhas.push(...linhasConsumidor(dados.consumidor));

	linhas.push(sep());
	const numero = String(dados.numero || 0).padStart(9, "0");
	const serie = String(dados.serie || 0).padStart(3, "0");
	linhas.push(`NFC-e n. ${numero}  Serie ${serie}`);
	if (dados.dhEmi) {
		linhas.push(`Emissao: ${formatarDataHoraDanfce(dados.dhEmi)}`);
	}
	if (dados.protocolo) {
		linhas.push("Protocolo de autorizacao:");
		linhas.push(formatarProtocoloDanfce(dados.protocolo));
	}
	if (dados.dhAutorizacao) {
		linhas.push(formatarDataHoraDanfce(dados.dhAutorizacao));
	}

	linhas.push(sep("="));
	if (dados.qrcode) {
		linhas.push(MARCADOR_QR_DANFCE);
		linhas.push(sep("="));
	}

	linhas.push(...centralizar("Tributos totais incidentes"));
	linhas.push(...centralizar("(Lei Federal 12.741/2012)"));
	const trib =
		dados.vTotTrib != null
			? `R$ ${formatarMoedaDanfce(dados.vTotTrib)}`
			: "R$ 0,00";
	linhas.push(...centralizar(trib));

	const extras = [dados.infAdFisco, dados.infCpl]
		.filter(Boolean)
		.join("; ")
		.split(";")
		.map((t) => t.trim())
		.filter(Boolean);
	if (extras.length) {
		linhas.push(sep());
		for (const trecho of extras) {
			linhas.push(...quebrar(trecho));
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
		fantasia: xml.emitente?.fantasia || fallback.emitente?.fantasia,
		cnpj: xml.emitente?.cnpj || fallback.emitente?.cnpj || "",
		ie: xml.emitente?.ie || fallback.emitente?.ie,
		logradouro: xml.emitente?.logradouro || fallback.emitente?.logradouro,
		numero: xml.emitente?.numero || fallback.emitente?.numero,
		complemento: xml.emitente?.complemento || fallback.emitente?.complemento,
		bairro: xml.emitente?.bairro || fallback.emitente?.bairro,
		municipio: xml.emitente?.municipio || fallback.emitente?.municipio,
		uf: xml.emitente?.uf || fallback.emitente?.uf,
		cep: xml.emitente?.cep || fallback.emitente?.cep,
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
		seguro: xml.seguro ?? fallback.seguro ?? 0,
		outras: xml.outras ?? fallback.outras ?? 0,
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
		infAdFisco: xml.infAdFisco || fallback.infAdFisco,
	};
}
