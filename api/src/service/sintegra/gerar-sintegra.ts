import {
	agruparItensRegistro50,
	buscarDadosContribuinteSintegra,
	listarInventarioFiscalSintegra,
	listarItensNotasSintegra,
	listarNotasSintegra,
	listarProdutosSintegra,
	listarResumoNfceDiarioSintegra,
	somarIpiPorNota,
} from "@/repositories/sintegra-repositories.js";
import { ContadorRegistrosSintegra } from "./contador-registros.js";
import { montarRegistro10, montarRegistro11 } from "./registros/registro-10.js";
import { montarRegistro50 } from "./registros/registro-50.js";
import { montarRegistro51 } from "./registros/registro-51.js";
import { montarRegistro53 } from "./registros/registro-53.js";
import { montarRegistro54 } from "./registros/registro-54.js";
import { montarRegistro61 } from "./registros/registro-61.js";
import { montarRegistro74 } from "./registros/registro-74.js";
import { montarRegistro75 } from "./registros/registro-75.js";
import { montarRegistros90 } from "./registros/registro-90.js";
import type {
	FinalidadeSintegra,
	GerarSintegraParametros,
	ResultadoGeracaoSintegra,
} from "./tipos-sintegra.js";
import { validarDadosSintegra } from "./validar-sintegra.js";

function parseNumero(valor: string | null | undefined): number {
	const numero = Number.parseFloat(String(valor ?? "0").replace(",", "."));
	return Number.isFinite(numero) ? numero : 0;
}

export async function gerarArquivoSintegra(
	params: GerarSintegraParametros,
): Promise<ResultadoGeracaoSintegra> {
	const finalidade: FinalidadeSintegra = params.finalidade ?? "1";
	const contador = new ContadorRegistrosSintegra();
	const linhas: string[] = [];

	const contribuinte = await buscarDadosContribuinteSintegra(params.idempresa);
	const notas = await listarNotasSintegra(params);
	const idsNotas = notas.map((nota) => nota.id);
	const itens = await listarItensNotasSintegra(idsNotas);
	const inventario = await listarInventarioFiscalSintegra(params);
	const resumosNfce = await listarResumoNfceDiarioSintegra(params);

	const validacao = validarDadosSintegra({
		contribuinte,
		notas,
		itens,
		inventario,
		incluirInventario: params.incluirInventario,
	});

	if (validacao.erros.length > 0) {
		throw new Error(validacao.erros.join(" "));
	}

	if (!contribuinte) {
		throw new Error("Contribuinte não encontrado.");
	}

	linhas.push(
		montarRegistro10({
			contribuinte,
			dataInicio: params.dataInicio,
			dataFim: params.dataFim,
			finalidade,
		}),
	);
	contador.incrementar("10");

	linhas.push(montarRegistro11(contribuinte));
	contador.incrementar("11");

	const notasModelo65 = new Set(
		notas.filter((nota) => nota.modelo === "65").map((nota) => nota.id),
	);
	const notasReg50 = notas.filter((nota) => !notasModelo65.has(nota.id));
	const agrupamentos50 = agruparItensRegistro50(notasReg50, itens);
	for (const agrupamento of agrupamentos50) {
		linhas.push(montarRegistro50(agrupamento));
		contador.incrementar("50");
	}

	const ipiPorNota = somarIpiPorNota(itens);
	for (const nota of notasReg50) {
		const valorIpi =
			parseNumero(nota.valorIpi) || (ipiPorNota.get(nota.id) ?? 0);
		if (valorIpi > 0) {
			linhas.push(montarRegistro51(nota, valorIpi));
			contador.incrementar("51");
		}
	}

	for (const nota of notasReg50) {
		if (
			parseNumero(nota.baseIcmsSt) > 0 ||
			parseNumero(nota.valorIcmsSt) > 0
		) {
			linhas.push(montarRegistro53(nota));
			contador.incrementar("53");
		}
	}

	const itensReg54 = itens.filter(
		(item) => !notasModelo65.has(item.idnotafiscal),
	);

	for (const item of itensReg54) {
		linhas.push(montarRegistro54(item));
		contador.incrementar("54");
	}

	if (resumosNfce.length === 0 && notasModelo65.size > 0) {
		validacao.alertas.push(
			"NFC-e encontradas, porém sem resumo diário elegível para registro 61.",
		);
	}

	if (resumosNfce.length > 0) {
		validacao.alertas.push(
			"NFC-e (modelo 65) informadas no registro 61; demais modelos permanecem nos registros 50/54.",
		);
	}

	for (const resumo of resumosNfce) {
		linhas.push(montarRegistro61(resumo));
		contador.incrementar("61");
	}

	if (params.incluirInventario) {
		for (const item of inventario) {
			linhas.push(montarRegistro74(item));
			contador.incrementar("74");
		}
	}

	const codigosProdutos = [
		...new Set(
			[...itens, ...inventario.map((item) => ({ codigoProduto: item.codigoProduto }))]
				.map((item) => item.codigoProduto)
				.filter(Boolean) as string[],
		),
	];
	const produtos = await listarProdutosSintegra(
		params.idempresa,
		codigosProdutos,
	);

	for (const produto of produtos) {
		linhas.push(
			montarRegistro75({
				produto,
				dataInicio: params.dataInicio,
				dataFim: params.dataFim,
			}),
		);
		contador.incrementar("75");
	}

	const totalGeral =
		contador.totalGeral() + 1;
	const registros90 = montarRegistros90({
		cnpj: contribuinte.cnpj,
		inscricaoEstadual: contribuinte.inscricaoEstadual,
		contadores: contador.obterTodos(),
		totalGeral,
	});

	for (const registro90 of registros90) {
		linhas.push(registro90);
		contador.incrementar("90");
	}

	const conteudo = `${linhas.join("\r\n")}\r\n`;
	const cnpjLimpo = contribuinte.cnpj.replace(/\D/g, "");
	const filename = `sintegra-${cnpjLimpo || params.idempresa.slice(0, 8)}-${params.dataInicio}-${params.dataFim}.txt`;

	return {
		conteudo,
		filename,
		alertas: validacao.alertas,
		totalLinhas: linhas.length,
	};
}
