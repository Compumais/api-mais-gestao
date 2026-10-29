import { randomUUID } from "node:crypto";
import { execute, query, queryOne } from "./database";

export type AcaoVistoria = "insercao" | "exclusao" | "fechamento";
export type OrigemVistoria = "pdv" | "pos";

export type AtorVistoria = {
	usuario?: string | null;
	origem?: OrigemVistoria;
};

export type RegistroVistoria = {
	id: string;
	acao: AcaoVistoria;
	idconta: string;
	numero_mesa: number;
	nomecliente: string | null;
	usuario: string;
	origem: OrigemVistoria;
	iditem: string | null;
	descricao: string | null;
	quantidade: number | null;
	precounitario: number | null;
	precototal: number | null;
	valortotal: number | null;
	detalhe: string | null;
	criadoem: string;
};

export type FiltroVistoria = {
	acao?: AcaoVistoria | null;
	numero?: number | null;
	usuario?: string | null;
	dia?: string | null;
};

const ACOES = new Set<AcaoVistoria>(["insercao", "exclusao", "fechamento"]);

export function intervaloDiaVistoria(
	dia: string | null | undefined,
	agora = new Date(),
): { desde: string; ate: string } {
	const texto = dia?.trim() ?? "";
	const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
	const inicio = partes
		? new Date(
				Number(partes[1]),
				Number(partes[2]) - 1,
				Number(partes[3]),
				0,
				0,
				0,
				0,
			)
		: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0);
	if (Number.isNaN(inicio.getTime())) {
		inicio.setTime(
			new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime(),
		);
	}
	const fim = new Date(inicio);
	fim.setHours(23, 59, 59, 999);
	return { desde: inicio.toISOString(), ate: fim.toISOString() };
}

async function nomeOperadorPdv(): Promise<string> {
	const row = await queryOne<{ username: string | null }>(
		"SELECT username FROM sessao WHERE id = 1",
	);
	return row?.username?.trim().slice(0, 80) || "PDV";
}

export async function registrarVistoria(entrada: {
	acao: AcaoVistoria;
	idconta: string;
	numeroMesa: number;
	nomecliente?: string | null;
	usuario?: string | null;
	origem?: OrigemVistoria;
	iditem?: string | null;
	descricao?: string | null;
	quantidade?: number | null;
	precounitario?: number | null;
	precototal?: number | null;
	valortotal?: number | null;
	detalhe?: string | null;
}): Promise<void> {
	try {
		const informado = entrada.usuario?.trim() ?? "";
		const usuario = (informado || (await nomeOperadorPdv())).slice(0, 80);
		const origem: OrigemVistoria = informado
			? entrada.origem === "pdv"
				? "pdv"
				: "pos"
			: "pdv";
		await execute(
			`INSERT INTO vistoria_conta (
				id, acao, idconta, numero_mesa, nomecliente, usuario, origem,
				iditem, descricao, quantidade, precounitario, precototal,
				valortotal, detalhe, criadoem
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7,
				$8, $9, $10, $11, $12,
				$13, $14, $15
			)`,
			[
				randomUUID(),
				entrada.acao,
				entrada.idconta,
				entrada.numeroMesa,
				entrada.nomecliente?.trim() || null,
				usuario,
				origem,
				entrada.iditem ?? null,
				entrada.descricao?.trim() || null,
				entrada.quantidade ?? null,
				entrada.precounitario ?? null,
				entrada.precototal ?? null,
				entrada.valortotal ?? null,
				entrada.detalhe?.trim() || null,
				new Date().toISOString(),
			],
		);
	} catch (err) {
		console.error(
			"[vistoria]",
			err instanceof Error ? err.message : "Falha ao gravar vistoria",
		);
	}
}

export async function listarVistoria(
	filtro: FiltroVistoria = {},
): Promise<RegistroVistoria[]> {
	const acao = filtro.acao && ACOES.has(filtro.acao) ? filtro.acao : null;
	const numero =
		filtro.numero != null && Number.isFinite(filtro.numero)
			? Math.trunc(filtro.numero)
			: null;
	const usuario = filtro.usuario?.trim() || null;
	const { desde, ate } = intervaloDiaVistoria(filtro.dia);
	return query<RegistroVistoria>(
		`SELECT id, acao, idconta, numero_mesa, nomecliente, usuario, origem,
			iditem, descricao, quantidade, precounitario, precototal,
			valortotal, detalhe, criadoem
		 FROM vistoria_conta
		 WHERE criadoem >= $1 AND criadoem <= $2
		   AND ($3::text IS NULL OR acao = $3)
		   AND ($4::int IS NULL OR numero_mesa = $4)
		   AND ($5::text IS NULL OR usuario ILIKE '%' || $5 || '%')
		 ORDER BY criadoem DESC
		 LIMIT 500`,
		[desde, ate, acao, numero, usuario],
	);
}
