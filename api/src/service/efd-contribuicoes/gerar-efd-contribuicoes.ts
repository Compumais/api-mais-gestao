import { createWriteStream } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finished } from "node:stream/promises";
import { listarAjustesApuracaoEfd } from "@/repositories/apuracao-efd-ajuste-repositories.js";
import {
	buscarContribuinteEfd,
	listarItensEfd,
	listarNotasEfd,
	listarParticipantesEfd,
	listarProdutosEfd,
} from "@/repositories/efd-icms-repositories.js";
import { ContadorRegistrosEfd } from "@/service/efd-icms/contador-registros.js";
import {
	montarRegistro0001,
	montarRegistro0150,
	montarRegistro0190,
	montarRegistro0200,
} from "@/service/efd-icms/registros/bloco-0.js";
import {
	montarRegistro9001,
	montarRegistro9990,
	montarRegistro9999,
	montarRegistros9900,
} from "@/service/efd-icms/registros/bloco-9.js";
import {
	codigoSituacaoDocumento,
	montarRegistroC100 as montarC100Icms,
} from "@/service/efd-icms/registros/bloco-c.js";
import type {
	ContribuinteEfd,
	GerarEfdIcmsParametros,
	ItemEfd,
	ResultadoGeracaoEfd,
} from "@/service/efd-icms/tipos-efd-icms.js";
import { validarPeriodoEfd } from "@/service/efd-icms/validar-efd-icms.js";
import {
	campoCnpjCpf,
	campoDataDdmmaaaa,
	campoDecimal,
	campoNumerico,
	campoTexto,
	formatarCstIcmsEfd,
	montarLinhaPipe,
	parseNumeroEfd,
} from "@/util/efd/formatador-pipe.js";
import { codigoVersaoEfdContribuicoes } from "@/util/efd/vigencia.js";

export function crtPermiteEfdContribuicoes(crt: number | null): boolean {
	return crt !== 1 && crt !== 2 && crt !== 4;
}

export function montarRegistro0000Contribuicoes(params: {
	contribuinte: ContribuinteEfd;
	dataInicio: string;
	dataFim: string;
	codVer: string;
	finalidade?: string;
}): string {
	const { contribuinte } = params;
	const cnpj = campoCnpjCpf(contribuinte.cnpj).padStart(14, "0");
	const codMun = campoNumerico(contribuinte.codigoMunicipioIbge)
		.padStart(7, "0")
		.slice(-7);
	const indAtiv = String(contribuinte.indativ ?? 2);

	return montarLinhaPipe([
		"0000",
		params.codVer,
		params.finalidade ?? "0",
		"",
		"",
		campoDataDdmmaaaa(params.dataInicio),
		campoDataDdmmaaaa(params.dataFim),
		campoTexto(contribuinte.razaosocial, 100),
		cnpj,
		campoTexto(contribuinte.uf, 2),
		codMun,
		"",
		"00",
		indAtiv,
	]);
}

export function montarRegistroC170Contribuicoes(
	item: ItemEfd,
	numeroItem: number,
): string {
	const cstIcms = formatarCstIcmsEfd(item.origem, item.cstIcms, item.csosn);
	const cfop = campoNumerico(item.cfop).padStart(4, "0").slice(-4);

	return montarLinhaPipe([
		"C170",
		String(numeroItem),
		campoTexto(item.codigoProduto, 60),
		campoTexto(item.descricao, 120),
		campoDecimal(item.quantidade, 5),
		campoTexto(item.unidade ?? "UN", 6),
		campoDecimal(item.valorItem),
		campoDecimal(item.desconto),
		"0",
		cstIcms,
		cfop,
		"",
		campoDecimal(item.baseIcms),
		campoDecimal(item.aliquotaIcms),
		campoDecimal(item.valorIcms),
		campoDecimal(item.baseIcmsSt),
		campoDecimal(item.aliquotaIcmsSt),
		campoDecimal(item.valorIcmsSt),
		"0",
		campoTexto(item.cstIpi, 2),
		"",
		"0,00",
		"0,00",
		campoDecimal(item.valorIpi),
		campoTexto(item.cstPis, 2),
		campoDecimal(item.basePis),
		campoDecimal(item.aliquotaPis, 4),
		"",
		"",
		campoDecimal(item.valorPis),
		campoTexto(item.cstCofins, 2),
		campoDecimal(item.baseCofins),
		campoDecimal(item.aliquotaCofins, 4),
		"",
		"",
		campoDecimal(item.valorCofins),
		"",
	]);
}

export function montarRegistroM210Contribuicoes(params: {
	codCont: string;
	baseCalculo: number;
	aliquota: number;
	valorApurado: number;
	valorRecolher: number;
}): string {
	const { codCont, baseCalculo, aliquota, valorApurado, valorRecolher } = params;
	return montarLinhaPipe([
		"M210",
		codCont,
		campoDecimal(baseCalculo),
		campoDecimal(baseCalculo),
		"0,00",
		"0,00",
		campoDecimal(baseCalculo),
		campoDecimal(aliquota, 4),
		"",
		"",
		campoDecimal(valorApurado),
		"0,00",
		"0,00",
		"0,00",
		"0,00",
		campoDecimal(valorRecolher),
	]);
}

export function montarRegistroM610Contribuicoes(params: {
	codCont: string;
	baseCalculo: number;
	aliquota: number;
	valorApurado: number;
	valorRecolher: number;
}): string {
	const { codCont, baseCalculo, aliquota, valorApurado, valorRecolher } = params;
	return montarLinhaPipe([
		"M610",
		codCont,
		campoDecimal(baseCalculo),
		campoDecimal(baseCalculo),
		"0,00",
		"0,00",
		campoDecimal(baseCalculo),
		campoDecimal(aliquota, 4),
		"",
		"",
		campoDecimal(valorApurado),
		"0,00",
		"0,00",
		"0,00",
		"0,00",
		campoDecimal(valorRecolher),
	]);
}

class EscritorEfd {
	private readonly caminho: string;
	private readonly stream: ReturnType<typeof createWriteStream>;
	linhas = 0;

	constructor() {
		this.caminho = join(
			tmpdir(),
			`efd-cont-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`,
		);
		this.stream = createWriteStream(this.caminho, { encoding: "utf8" });
	}

	escrever(linha: string): void {
		this.stream.write(`${linha}\r\n`);
		this.linhas += 1;
	}

	async finalizar(): Promise<string> {
		this.stream.end();
		await finished(this.stream);
		const conteudo = await readFile(this.caminho, "utf8");
		await unlink(this.caminho).catch(() => undefined);
		return conteudo;
	}
}

export async function gerarArquivoEfdContribuicoes(
	params: GerarEfdIcmsParametros,
): Promise<ResultadoGeracaoEfd> {
	const erroPeriodo = validarPeriodoEfd(params.dataInicio, params.dataFim);
	if (erroPeriodo) throw new Error(erroPeriodo);

	const contribuinte = await buscarContribuinteEfd(params.idempresa);
	if (!contribuinte) {
		throw new Error("Configuração fiscal da empresa não encontrada.");
	}

	if (!crtPermiteEfdContribuicoes(contribuinte.crt)) {
		throw new Error(
			"EFD-Contribuições não se aplica ao Simples Nacional / MEI (CRT 1, 2 ou 4).",
		);
	}

	const notas = await listarNotasEfd(params);
	const itens = await listarItensEfd(notas.map((nota) => nota.id));
	const ajustes = await listarAjustesApuracaoEfd(
		params.idempresa,
		`${params.dataInicio.slice(0, 7)}-01`,
	);

	const escritor = new EscritorEfd();
	const contador = new ContadorRegistrosEfd();
	let linhasBloco = 0;
	const escrever = (linha: string, tipo: string) => {
		escritor.escrever(linha);
		contador.incrementar(tipo);
		linhasBloco += 1;
	};

	const cnpj = campoCnpjCpf(contribuinte.cnpj).padStart(14, "0");
	const codVer = codigoVersaoEfdContribuicoes(params.dataInicio);

	escrever(
		montarRegistro0000Contribuicoes({
			contribuinte,
			dataInicio: params.dataInicio,
			dataFim: params.dataFim,
			codVer,
			finalidade: params.finalidade ?? "0",
		}),
		"0000",
	);
	escrever(montarRegistro0001("0"), "0001");

	// Determina o regime de apuração com base nas alíquotas observadas
	let temAliquotaNaoCumulativa = false;
	for (const item of itens) {
		const aliqPis = parseNumeroEfd(item.aliquotaPis);
		const aliqCofins = parseNumeroEfd(item.aliquotaCofins);
		if (aliqPis > 1.0 || aliqCofins > 4.0) {
			temAliquotaNaoCumulativa = true;
			break;
		}
	}

	if (temAliquotaNaoCumulativa) {
		// 1 - Apuração exclusivamente no regime não-cumulativo (Lucro Real)
		escrever(montarLinhaPipe(["0110", "1", "1", "1", ""]), "0110");
	} else {
		// 2 - Apuração exclusivamente no regime cumulativo (Lucro Presumido - Competência)
		escrever(montarLinhaPipe(["0110", "2", "", "", "2"]), "0110");
	}

	escrever(
		montarLinhaPipe([
			"0140",
			"1",
			campoTexto(contribuinte.razaosocial, 100),
			cnpj,
			campoTexto(contribuinte.uf, 2),
			campoTexto(contribuinte.inscricaoEstadual, 14),
			campoNumerico(contribuinte.codigoMunicipioIbge)
				.padStart(7, "0")
				.slice(-7),
			campoTexto(contribuinte.inscricaoMunicipal, 15),
			"",
		]),
		"0140",
	);

	const participantes = await listarParticipantesEfd(
		notas
			.filter((nota) => (nota.modelo ?? "") !== "65")
			.map((nota) => nota.codigoParticipante)
			.filter((id): id is string => Boolean(id)),
	);
	for (const participante of participantes) {
		escrever(
			montarRegistro0150({
				codigo: participante.codigo,
				nome: participante.nome,
				cnpjCpf: participante.cnpjCpf,
				ie: participante.inscricaoEstadual,
				codigoMunicipio: participante.codigoMunicipio,
				endereco: participante.endereco,
				numero: participante.numero,
				complemento: participante.complemento,
				bairro: participante.bairro,
			}),
			"0150",
		);
	}

	const unidades = new Map<string, string>();
	const codigosProdutos: string[] = [];
	for (const item of itens) {
		const unidade = (item.unidade ?? "UN").trim() || "UN";
		unidades.set(unidade.toUpperCase(), unidade);
		if (item.codigoProduto) codigosProdutos.push(item.codigoProduto);
	}
	for (const [codigo, descricao] of [...unidades.entries()].sort()) {
		escrever(montarRegistro0190(codigo, descricao), "0190");
	}
	const produtos = await listarProdutosEfd(params.idempresa, codigosProdutos);
	for (const produto of produtos) {
		escrever(montarRegistro0200(produto), "0200");
	}
	escrever(montarLinhaPipe(["0990", String(linhasBloco + 1)]), "0990");

	linhasBloco = 0;
	escrever(montarLinhaPipe(["C001", notas.length > 0 ? "0" : "1"]), "C001");
	if (notas.length > 0) {
		escrever(montarLinhaPipe(["C010", cnpj, "2"]), "C010");
	}

	const itensPorNota = new Map<string, typeof itens>();
	for (const item of itens) {
		const lista = itensPorNota.get(item.idnotafiscal) ?? [];
		lista.push(item);
		itensPorNota.set(item.idnotafiscal, lista);
	}

	let totalPis = 0;
	let totalCofins = 0;
	let baseCalculoPisTotal = 0;
	let baseCalculoCofinsTotal = 0;
	let somaAliqPis = 0;
	let somaAliqCofins = 0;
	let qtdItensPis = 0;
	let qtdItensCofins = 0;

	for (const nota of notas) {
		const situacao = codigoSituacaoDocumento(nota);
		escrever(montarC100Icms(nota, situacao === "00"), "C100");
		const itensNota = itensPorNota.get(nota.id) ?? [];
		if (situacao === "00") {
			itensNota.forEach((item, indice) => {
				escrever(montarRegistroC170Contribuicoes(item, indice + 1), "C170");
				if (nota.tipoorigem !== 0) {
					const vPis = parseNumeroEfd(item.valorPis);
					const vCofins = parseNumeroEfd(item.valorCofins);
					const bPis = parseNumeroEfd(item.basePis);
					const bCofins = parseNumeroEfd(item.baseCofins);
					const aPis = parseNumeroEfd(item.aliquotaPis);
					const aCofins = parseNumeroEfd(item.aliquotaCofins);

					totalPis += vPis;
					totalCofins += vCofins;
					baseCalculoPisTotal +=
						bPis > 0 ? bPis : vPis > 0 ? parseNumeroEfd(item.valorItem) : 0;
					baseCalculoCofinsTotal +=
						bCofins > 0 ? bCofins : vCofins > 0 ? parseNumeroEfd(item.valorItem) : 0;

					if (aPis > 0) {
						somaAliqPis += aPis;
						qtdItensPis += 1;
					}
					if (aCofins > 0) {
						somaAliqCofins += aCofins;
						qtdItensCofins += 1;
					}
				}
			});
		}
	}
	escrever(montarLinhaPipe(["C990", String(linhasBloco + 1)]), "C990");

	linhasBloco = 0;
	escrever(montarLinhaPipe(["M001", "0"]), "M001");
	const ajPis = ajustes
		.filter((a) => a.tipo === "pis")
		.reduce(
			(acc, a) =>
				acc + parseNumeroEfd(a.valor) * (a.natureza === "debito" ? 1 : -1),
			0,
		);
	const ajCofins = ajustes
		.filter((a) => a.tipo === "cofins")
		.reduce(
			(acc, a) =>
				acc + parseNumeroEfd(a.valor) * (a.natureza === "debito" ? 1 : -1),
			0,
		);
	const pisRecolher = Math.max(0, totalPis + ajPis);
	const cofinsRecolher = Math.max(0, totalCofins + ajCofins);

	const codContribuicao = temAliquotaNaoCumulativa ? "01" : "51";
	const aliqPisMedia =
		qtdItensPis > 0
			? somaAliqPis / qtdItensPis
			: temAliquotaNaoCumulativa
				? 1.65
				: 0.65;
	const aliqCofinsMedia =
		qtdItensCofins > 0
			? somaAliqCofins / qtdItensCofins
			: temAliquotaNaoCumulativa
				? 7.6
				: 3.0;

	escrever(
		montarLinhaPipe([
			"M200",
			"0,00",
			"0,00",
			"0,00",
			"0,00",
			"0,00",
			"0,00",
			"0,00",
			campoDecimal(totalPis),
			"0,00",
			"0,00",
			campoDecimal(pisRecolher),
			campoDecimal(pisRecolher),
		]),
		"M200",
	);

	if (totalPis > 0 || pisRecolher > 0) {
		escrever(
			montarRegistroM210Contribuicoes({
				codCont: codContribuicao,
				baseCalculo: baseCalculoPisTotal,
				aliquota: aliqPisMedia,
				valorApurado: totalPis,
				valorRecolher: pisRecolher,
			}),
			"M210",
		);
	}

	escrever(
		montarLinhaPipe([
			"M600",
			"0,00",
			"0,00",
			"0,00",
			"0,00",
			"0,00",
			"0,00",
			"0,00",
			campoDecimal(totalCofins),
			"0,00",
			"0,00",
			campoDecimal(cofinsRecolher),
			campoDecimal(cofinsRecolher),
		]),
		"M600",
	);

	if (totalCofins > 0 || cofinsRecolher > 0) {
		escrever(
			montarRegistroM610Contribuicoes({
				codCont: codContribuicao,
				baseCalculo: baseCalculoCofinsTotal,
				aliquota: aliqCofinsMedia,
				valorApurado: totalCofins,
				valorRecolher: cofinsRecolher,
			}),
			"M610",
		);
	}

	escrever(montarLinhaPipe(["M990", String(linhasBloco + 1)]), "M990");

	escrever(montarRegistro9001(), "9001");
	const linhas9900 = montarRegistros9900(contador);
	for (const linha of linhas9900) {
		escritor.escrever(linha);
		contador.incrementar("9900");
	}
	escrever(montarRegistro9990(linhas9900.length + 2), "9990");
	escrever(montarRegistro9999(escritor.linhas + 1), "9999");

	const conteudo = await escritor.finalizar();
	return {
		conteudo,
		filename: `EFD-CONTRIBUICOES-${cnpj}-${params.dataInicio.slice(0, 7)}.txt`,
		alertas:
			notas.length === 0
				? ["Nenhuma nota fiscal encontrada no período informado."]
				: [],
		totalLinhas: escritor.linhas,
	};
}
