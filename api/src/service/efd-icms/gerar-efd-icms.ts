import { createWriteStream } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finished } from "node:stream/promises";
import {
	buscarContribuinteEfd,
	listarAjustesIcmsEfd,
	listarInventarioEfd,
	listarItensEfd,
	listarNotasEfd,
	listarParticipantesEfd,
	listarProdutosEfd,
} from "@/repositories/efd-icms-repositories.js";
import { parseNumeroEfd } from "@/util/efd/formatador-pipe.js";
import { codigoVersaoEfdIcms } from "@/util/efd/vigencia.js";
import { ContadorRegistrosEfd } from "./contador-registros.js";
import {
	montarRegistro0000,
	montarRegistro0001,
	montarRegistro0005,
	montarRegistro0150,
	montarRegistro0190,
	montarRegistro0200,
	montarRegistro0990,
} from "./registros/bloco-0.js";
import {
	montarRegistro9001,
	montarRegistro9990,
	montarRegistro9999,
	montarRegistros9900,
} from "./registros/bloco-9.js";
import {
	agruparItensC190,
	codigoSituacaoDocumento,
	conferirC190IgualC170,
	montarRegistroC001,
	montarRegistroC100,
	montarRegistroC170,
	montarRegistroC190,
	montarRegistroC990,
} from "./registros/bloco-c.js";
import {
	calcularTotaisE110,
	montarRegistroE001,
	montarRegistroE100,
	montarRegistroE110,
	montarRegistroE111,
	montarRegistroE990,
} from "./registros/bloco-e.js";
import {
	montarRegistroH001,
	montarRegistroH005,
	montarRegistroH010,
	montarRegistroH990,
} from "./registros/bloco-h.js";
import type {
	GerarEfdIcmsParametros,
	ResultadoGeracaoEfd,
} from "./tipos-efd-icms.js";
import {
	alertasParticipantesEfd,
	validarDadosEfdIcms,
	validarProdutosEfd,
} from "./validar-efd-icms.js";

class EscritorEfd {
	private readonly caminho: string;
	private readonly stream: ReturnType<typeof createWriteStream>;
	linhas = 0;

	constructor() {
		this.caminho = join(
			tmpdir(),
			`efd-icms-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`,
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

export async function gerarArquivoEfdIcms(
	params: GerarEfdIcmsParametros,
): Promise<ResultadoGeracaoEfd> {
	const finalidade = params.finalidade ?? "0";
	const contador = new ContadorRegistrosEfd();
	const escritor = new EscritorEfd();
	let linhasBloco = 0;

	const contribuinte = await buscarContribuinteEfd(params.idempresa);
	const notas = await listarNotasEfd(params);
	const itens = await listarItensEfd(notas.map((nota) => nota.id));
	const inventario = await listarInventarioEfd(params);
	const ajustes = await listarAjustesIcmsEfd(
		params.idempresa,
		`${params.dataInicio.slice(0, 7)}-01`,
	);

	const validacao = validarDadosEfdIcms({
		contribuinte,
		notas,
		itens,
		inventario,
		incluirInventario: params.incluirInventario,
	});

	if (validacao.erros.length > 0) {
		await escritor.finalizar().catch(() => undefined);
		throw new Error(validacao.erros.join(" "));
	}

	if (!contribuinte) {
		await escritor.finalizar().catch(() => undefined);
		throw new Error("Contribuinte não encontrado.");
	}

	const itensPorNota = new Map<string, typeof itens>();
	for (const item of itens) {
		const lista = itensPorNota.get(item.idnotafiscal) ?? [];
		lista.push(item);
		itensPorNota.set(item.idnotafiscal, lista);
	}

	const perfilCompleto = contribuinte.indperfil === "A";
	const codVer = codigoVersaoEfdIcms(params.dataInicio);

	const escrever = (linha: string, tipo: string) => {
		escritor.escrever(linha);
		contador.incrementar(tipo);
		linhasBloco += 1;
	};

	escrever(
		montarRegistro0000({
			contribuinte,
			dataInicio: params.dataInicio,
			dataFim: params.dataFim,
			codVer,
			finalidade,
		}),
		"0000",
	);
	escrever(montarRegistro0001("0"), "0001");
	escrever(montarRegistro0005(contribuinte), "0005");

	const participantes = await listarParticipantesEfd(
		notas
			.filter((nota) => (nota.modelo ?? "") !== "65")
			.map((nota) => nota.codigoParticipante)
			.filter((id): id is string => Boolean(id)),
	);
	validacao.alertas.push(...alertasParticipantesEfd(participantes));
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
	for (const item of inventario) {
		const unidade = (item.unidade ?? "UN").trim() || "UN";
		unidades.set(unidade.toUpperCase(), unidade);
		codigosProdutos.push(item.codigoProduto);
	}
	for (const [codigo, descricao] of [...unidades.entries()].sort()) {
		escrever(montarRegistro0190(codigo, descricao), "0190");
	}

	const produtos = await listarProdutosEfd(params.idempresa, codigosProdutos);
	const errosProdutos = validarProdutosEfd(produtos);
	if (errosProdutos.length > 0) {
		await escritor.finalizar().catch(() => undefined);
		throw new Error(errosProdutos.join(" "));
	}
	for (const produto of produtos) {
		escrever(montarRegistro0200(produto), "0200");
	}

	escrever(montarRegistro0990(linhasBloco + 1), "0990");

	linhasBloco = 0;
	const notasComMovimento = notas.length > 0;
	escrever(montarRegistroC001(notasComMovimento ? "0" : "1"), "C001");

	const gruposPorNota: Array<{
		indOper: "0" | "1";
		grupos: ReturnType<typeof agruparItensC190>;
	}> = [];

	for (const nota of notas) {
		const itensNota = itensPorNota.get(nota.id) ?? [];
		const situacao = codigoSituacaoDocumento(nota);

		escrever(montarRegistroC100(nota, situacao === "00"), "C100");

		if (situacao === "00" && perfilCompleto && itensNota.length > 0) {
			itensNota.forEach((item, indice) => {
				escrever(montarRegistroC170(item, indice + 1), "C170");
			});
		}

		if (situacao === "00") {
			const grupos = agruparItensC190(itensNota);
			gruposPorNota.push({
				indOper: nota.tipoorigem === 0 ? "0" : "1",
				grupos,
			});
			for (const grupo of grupos) {
				escrever(montarRegistroC190(grupo), "C190");
			}
			for (const alerta of conferirC190IgualC170(itensNota, grupos)) {
				validacao.alertas.push(`${alerta} (NF ${nota.numero ?? nota.id})`);
			}
		}

		if (
			!nota.chave &&
			(nota.modelo === "55" || nota.modelo === "65") &&
			situacao === "00"
		) {
			validacao.alertas.push(
				`Documento modelo ${nota.modelo} número ${nota.numero ?? "?"} sem chave.`,
			);
		}
	}

	escrever(montarRegistroC990(linhasBloco + 1), "C990");

	linhasBloco = 0;
	const temApuracao = notasComMovimento || ajustes.length > 0;
	escrever(montarRegistroE001(temApuracao ? "0" : "1"), "E001");
	if (temApuracao) {
		escrever(montarRegistroE100(params.dataInicio, params.dataFim), "E100");
		const totais = calcularTotaisE110(gruposPorNota, ajustes);
		escrever(montarRegistroE110(totais), "E110");
		for (const ajuste of ajustes) {
			escrever(montarRegistroE111(ajuste), "E111");
		}
	}
	escrever(montarRegistroE990(linhasBloco + 1), "E990");

	linhasBloco = 0;
	const temInventario = inventario.length > 0;
	escrever(montarRegistroH001(temInventario ? "0" : "1"), "H001");
	if (temInventario && params.dataInventario) {
		const totalInventario = inventario.reduce(
			(acc, item) => acc + parseNumeroEfd(item.valorTotal),
			0,
		);
		escrever(
			montarRegistroH005(params.dataInventario, totalInventario),
			"H005",
		);
		for (const item of inventario) {
			escrever(montarRegistroH010(item), "H010");
		}
	}
	escrever(montarRegistroH990(linhasBloco + 1), "H990");

	escrever(montarRegistro9001(), "9001");
	const linhas9900 = montarRegistros9900(contador);
	for (const linha of linhas9900) {
		escritor.escrever(linha);
		contador.incrementar("9900");
	}
	escrever(montarRegistro9990(2 + linhas9900.length + 1), "9990");
	escrever(montarRegistro9999(escritor.linhas + 1), "9999");

	const conteudo = await escritor.finalizar();
	const cnpj = contribuinte.cnpj.replace(/\D/g, "");
	const filename = `EFD-ICMS-${cnpj || params.idempresa.slice(0, 8)}-${params.dataInicio.slice(0, 7)}.txt`;

	return {
		conteudo,
		filename,
		alertas: [...new Set(validacao.alertas)],
		totalLinhas: escritor.linhas,
	};
}
