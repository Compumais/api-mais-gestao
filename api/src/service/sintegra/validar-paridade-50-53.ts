import type { ValoresRegistro53 } from "./agrupar-valores-registro-53.js";
import { formatarCfop } from "./formatador-campo.js";
import type { AgrupamentoRegistro50 } from "./tipos-sintegra.js";

function chaveRegistro50Ou53(
	agrupamento: AgrupamentoRegistro50,
	cfop: string,
): string {
	const { nota } = agrupamento;
	const cnpj = (nota.cnpjCpf ?? "").replace(/\D/g, "");
	const data = (nota.dataCompetencia ?? nota.emissao ?? "").slice(0, 10);
	const uf = (nota.uf ?? "").toUpperCase();
	const modelo = (nota.modelo ?? "").replace(/\D/g, "").padStart(2, "0").slice(-2);
	const serie = String(nota.serie ?? "")
		.trim()
		.replace(/\D/g, "")
		.padStart(3, "0")
		.slice(-3);
	const numero = String(nota.numero ?? nota.numeronotafiscal ?? "")
		.replace(/\D/g, "")
		.padStart(6, "0")
		.slice(-6);
	const cfopNorm = formatarCfop(cfop).trim();
	return `${cnpj}|${data}|${uf}|${modelo}|${serie}|${numero}|${cfopNorm}|${nota.emitente}`;
}

/** Garante que cada registro 53 terá par no registro 50 (mesma chave de documento + CFOP). */
export function validarParidadeRegistros50e53(
	agrupamentos50: AgrupamentoRegistro50[],
	registros53: ValoresRegistro53[],
): string[] {
	const chaves50 = new Set(
		agrupamentos50.map((a) => chaveRegistro50Ou53(a, a.cfop)),
	);
	const erros: string[] = [];

	for (const registro of registros53) {
		const chave = chaveRegistro50Ou53(
			registro.agrupamento,
			registro.agrupamento.cfop,
		);
		if (chaves50.has(chave)) continue;

		const nota = registro.agrupamento.nota;
		const numeroDoc = nota.numero ?? nota.numeronotafiscal ?? "?";
		erros.push(
			`Registro 53 sem registro 50 correspondente (participante ${nota.cnpjCpf ?? "?"}, NF ${numeroDoc}, CFOP ${registro.agrupamento.cfop}).`,
		);
	}

	return erros;
}
