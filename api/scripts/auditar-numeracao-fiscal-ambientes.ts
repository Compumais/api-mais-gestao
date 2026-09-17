/**
 * Conferência somente leitura dos contadores NF-e/NFC-e por ambiente.
 *
 * Uso:
 *   npm run auditar-numeracao-fiscal
 *   npm run auditar-numeracao-fiscal -- --cnpj 52720549000154
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/repositories/connection.js";

function obterArg(nome: string): string | undefined {
	const indice = process.argv.indexOf(nome);
	return indice === -1 ? undefined : process.argv[indice + 1];
}

type LinhaAuditoria = {
	cnpj: string | null;
	modelo: string;
	serie: string;
	ambiente: number;
	numeroproximo: number;
	maiornumero: number | null;
	quantidadedocumentos: number;
};

async function main() {
	const cnpj = obterArg("--cnpj")?.replace(/\D/g, "");
	const filtroCnpj = cnpj
		? sql`regexp_replace(coalesce(e.cnpj, ''), '[^0-9]', '', 'g') = ${cnpj}`
		: sql`true`;

	const resultado = await db.execute<LinhaAuditoria>(sql`
		select
			e.cnpj,
			s.modelo,
			s.serie,
			s.ambiente,
			s.numeroproximo,
			max(
				case
					when nf.numeronotafiscal ~ '^[0-9]+$'
					then nf.numeronotafiscal::int
				end
			)::int as maiornumero,
			count(nf.id)::int as quantidadedocumentos
		from nfeserie s
		inner join empresa e on e.id = s.idempresa
		left join notafiscal nf
			on nf.idserie = s.id
			and coalesce(nf.tipoambientenfe, 1) = s.ambiente
		where ${filtroCnpj}
		group by
			e.cnpj,
			s.idempresa,
			s.modelo,
			s.serie,
			s.ambiente,
			s.numeroproximo
		order by e.cnpj, s.modelo, s.serie, s.ambiente
	`);

	console.table(resultado.rows);
}

main().catch((erro) => {
	console.error("Falha na auditoria de numeração fiscal:", erro);
	process.exitCode = 1;
});
