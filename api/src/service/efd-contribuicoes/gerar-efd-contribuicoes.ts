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
	montarRegistroC170 as montarC170Icms,
} from "@/service/efd-icms/registros/bloco-c.js";
import type {
	GerarEfdIcmsParametros,
	ResultadoGeracaoEfd,
} from "@/service/efd-icms/tipos-efd-icms.js";
import { validarPeriodoEfd } from "@/service/efd-icms/validar-efd-icms.js";
import {
	campoCnpjCpf,
	campoDataDdmmaaaa,
	campoDecimal,
	campoNumerico,
	campoTexto,
	montarLinhaPipe,
	parseNumeroEfd,
} from "@/util/efd/formatador-pipe.js";
import { codigoVersaoEfdContribuicoes } from "@/util/efd/vigencia.js";

export function crtPermiteEfdContribuicoes(crt: number | null): boolean {
	return crt !== 1 && crt !== 2 && crt !== 4;
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
	escrever(
		montarLinhaPipe([
			"0000",
			codigoVersaoEfdContribuicoes(params.dataInicio),
			params.finalidade ?? "0",
			"0",
			"",
			campoDataDdmmaaaa(params.dataInicio),
			campoDataDdmmaaaa(params.dataFim),
			campoTexto(contribuinte.razaosocial, 100),
			cnpj,
			campoTexto(contribuinte.uf, 2),
			campoTexto(contribuinte.inscricaoEstadual, 14),
			campoNumerico(contribuinte.codigoMunicipioIbge)
				.padStart(7, "0")
				.slice(-7),
			campoTexto(contribuinte.inscricaoMunicipal, 15),
			"",
			"00",
			"0",
		]),
		"0000",
	);
	escrever(montarRegistro0001("0"), "0001");
	escrever(montarLinhaPipe(["0110", "2", "", "", "2"]), "0110");
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
	for (const nota of notas) {
		const situacao = codigoSituacaoDocumento(nota);
		escrever(montarC100Icms(nota, situacao === "00"), "C100");
		const itensNota = itensPorNota.get(nota.id) ?? [];
		if (situacao === "00") {
			itensNota.forEach((item, indice) => {
				escrever(montarC170Icms(item, indice + 1), "C170");
				if (nota.tipoorigem !== 0) {
					totalPis += parseNumeroEfd(item.valorPis);
					totalCofins += parseNumeroEfd(item.valorCofins);
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
	escrever(montarLinhaPipe(["M990", String(linhasBloco + 1)]), "M990");

	escrever(montarRegistro9001(), "9001");
	const linhas9900 = montarRegistros9900(contador);
	for (const linha of linhas9900) {
		escritor.escrever(linha);
		contador.incrementar("9900");
	}
	escrever(montarRegistro9990(2 + linhas9900.length + 1), "9990");
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
