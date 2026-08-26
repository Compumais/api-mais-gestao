import { campoNumerico } from "@/util/efd/formatador-pipe.js";
import { mesCompetencia } from "@/util/efd/vigencia.js";
import { codigoSituacaoDocumento } from "./registros/bloco-c.js";
import type {
	ContribuinteEfd,
	InventarioEfd,
	ItemEfd,
	NotaEfd,
	ParticipanteEfd,
	ProdutoEfd,
	ResultadoValidacaoEfd,
} from "./tipos-efd-icms.js";

export function validarPeriodoEfd(
	dataInicio: string,
	dataFim: string,
): string | null {
	if (dataInicio > dataFim) {
		return "Data inicial não pode ser maior que data final";
	}
	if (!mesCompetencia(dataInicio, dataFim)) {
		return "O período da EFD deve ser um mês civil (início e fim no mesmo mês).";
	}
	return null;
}

export function validarDadosEfdIcms({
	contribuinte,
	notas,
	itens,
	inventario,
	incluirInventario,
}: {
	contribuinte: ContribuinteEfd | null;
	notas: NotaEfd[];
	itens: ItemEfd[];
	inventario: InventarioEfd[];
	incluirInventario?: boolean;
}): ResultadoValidacaoEfd {
	const erros: string[] = [];
	const alertas: string[] = [];

	if (!contribuinte) {
		erros.push(
			"Configuração fiscal da empresa não encontrada (empresafiscal).",
		);
		return { erros, alertas };
	}

	if (!contribuinte.cnpj?.replace(/\D/g, "")) {
		erros.push("CNPJ do contribuinte não informado.");
	}
	if (!contribuinte.inscricaoEstadual?.trim()) {
		erros.push("Inscrição estadual do contribuinte não informada.");
	}
	if (!contribuinte.codigoMunicipioIbge?.replace(/\D/g, "")) {
		erros.push("Código do município IBGE não informado na empresa fiscal.");
	}
	if (!contribuinte.razaosocial?.trim()) {
		erros.push("Razão social não informada na empresa fiscal.");
	}

	if (notas.length === 0) {
		alertas.push("Nenhuma nota fiscal encontrada no período informado.");
	}

	const itensSemProduto = itens.filter((item) => !item.codigoProduto?.trim());
	if (itensSemProduto.length > 0) {
		alertas.push(`${itensSemProduto.length} item(ns) sem código de produto.`);
	}

	const itensSemCfop = itens.filter((item) => !item.cfop?.replace(/\D/g, ""));
	if (itensSemCfop.length > 0) {
		alertas.push(`${itensSemCfop.length} item(ns) sem CFOP.`);
	}

	const itensSemUnidade = itens.filter((item) => !item.unidade?.trim());
	if (itensSemUnidade.length > 0) {
		erros.push(
			`${itensSemUnidade.length} item(ns) sem unidade de medida. Corrija o cadastro antes de gerar a EFD.`,
		);
	}

	const notasPorId = new Map(notas.map((nota) => [nota.id, nota]));
	for (const nota of notas) {
		const modelo = campoNumerico(nota.modelo).padStart(2, "0").slice(-2);
		if (!modelo || modelo === "00") {
			erros.push(
				`Documento ${nota.numero ?? nota.id} sem modelo fiscal (55/65).`,
			);
			continue;
		}
		if (
			(modelo === "55" || modelo === "65") &&
			!String(nota.serie ?? "").trim()
		) {
			erros.push(
				`Documento modelo ${modelo} número ${nota.numero ?? "?"} sem série.`,
			);
		}
		const situacao = codigoSituacaoDocumento(nota);
		if (
			(modelo === "55" || modelo === "65") &&
			situacao !== "05" &&
			campoNumerico(nota.chave).length !== 44
		) {
			erros.push(
				`Documento modelo ${modelo} número ${nota.numero ?? "?"} exige chave de 44 dígitos.`,
			);
		}
	}

	for (const item of itens) {
		const nota = notasPorId.get(item.idnotafiscal);
		const cfop = campoNumerico(item.cfop);
		if (nota?.tipoorigem === 0 && /^[567]/.test(cfop)) {
			alertas.push(
				`Item ${item.codigoProduto ?? item.id} com CFOP de saída (${cfop}) em nota de entrada.`,
			);
		}
		if (nota?.tipoorigem === 1 && /^[123]/.test(cfop)) {
			alertas.push(
				`Item ${item.codigoProduto ?? item.id} com CFOP de entrada (${cfop}) em nota de saída.`,
			);
		}
		if (
			(contribuinte.crt === 1 || contribuinte.crt === 2) &&
			item.cstIcms &&
			!item.csosn
		) {
			alertas.push(
				`Item ${item.codigoProduto ?? item.id} no Simples com CST ${item.cstIcms} e sem CSOSN.`,
			);
		}
		if (contribuinte.crt === 3 && item.csosn && !item.cstIcms) {
			alertas.push(
				`Item ${item.codigoProduto ?? item.id} no CRT 3 com CSOSN ${item.csosn} e sem CST.`,
			);
		}
	}

	if (incluirInventario && inventario.length === 0) {
		alertas.push(
			"Inventário solicitado, porém não há registros na data informada.",
		);
	}

	if (contribuinte.crt === 1 || contribuinte.crt === 2) {
		alertas.push(
			"CRT Simples Nacional: confira CSOSN nos itens. A EFD-Contribuições não se aplica na regra geral.",
		);
	}

	return { erros, alertas };
}

export function validarProdutosEfd(produtos: ProdutoEfd[]): string[] {
	const erros: string[] = [];
	for (const produto of produtos) {
		const tipo = campoNumerico(produto.tipoItem);
		if (!tipo) {
			erros.push(
				`Produto ${produto.codigo} sem tipo de item (tipoproduto) para o registro 0200.`,
			);
		}
		const ncm = campoNumerico(produto.ncm);
		if (ncm.length !== 8) {
			erros.push(
				`Produto ${produto.codigo} sem NCM de 8 dígitos (obrigatório no 0200).`,
			);
		}
	}
	return erros;
}

export function alertasParticipantesEfd(
	participantes: ParticipanteEfd[],
): string[] {
	const alertas: string[] = [];
	for (const participante of participantes) {
		const documento = campoNumerico(participante.cnpjCpf);
		if (documento.length === 14 && !participante.inscricaoEstadual?.trim()) {
			alertas.push(
				`Participante ${participante.nome} (CNPJ) sem inscrição estadual.`,
			);
		}
	}
	return alertas;
}
