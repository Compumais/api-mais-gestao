import fs from "node:fs";

const snap = JSON.parse(
	fs.readFileSync("drizzle/meta/0012_snapshot.json", "utf8"),
);

const extra = {
	quantidade: "numeric(15, 6)",
	precounitario: "numeric(15, 6)",
	total: "numeric(12, 2)",
	desconto: "numeric(12, 2)",
	baseicms: "numeric(12, 2)",
	percentualicms: "numeric(5, 2)",
	icms: "numeric(12, 2)",
	aliquotapis: "numeric(12, 4)",
	pis: "numeric(12, 2)",
	cofins: "numeric(12, 2)",
	ipi: "numeric(12, 2)",
	custoaquisicao: "numeric(15, 6)",
	frete: "numeric(12, 2)",
	seguro: "numeric(12, 2)",
	outrasdespesas: "numeric(12, 2)",
	pisretido: "numeric(12, 2)",
	cofinsretido: "numeric(12, 2)",
	inss: "numeric(12, 2)",
};

function drizzleType(type, name) {
	const varcharMatch = type.match(/varchar\((\d+)\)/);
	if (varcharMatch) {
		return `varchar({ length: ${varcharMatch[1]} })`;
	}
	if (type === "text") return "text()";
	if (type === "smallint") return "smallint()";
	if (type === "bigint") return 'bigint({ mode: "number" })';
	if (type === "date") return "date()";
	if (type === "char(1)") return "char({ length: 1 })";
	if (type.startsWith("timestamp")) {
		return 'timestamp({ precision: 3, mode: "string" })';
	}
	const numericMatch = type.match(/numeric\((\d+),\s*(\d+)\)/);
	if (numericMatch) {
		return `numeric({ precision: ${numericMatch[1]}, scale: ${numericMatch[2]}, mode: "string" })`;
	}
	throw new Error(`tipo desconhecido ${type} em ${name}`);
}

const cols = { ...snap.tables["public.notafiscalitem"].columns };
for (const [key, type] of Object.entries(extra)) {
	cols[key] = { name: key, type, notNull: false, primaryKey: false };
}

const lines = Object.entries(cols).map(([key, col]) => {
	if (key === "id") return "\t\tid: text().primaryKey().notNull(),";
	if (key === "idnotafiscal") return "\t\tidnotafiscal: text().notNull(),";
	return `\t\t${key}: ${drizzleType(col.type, key)},`;
});

const out = `import {
\tbigint,
\tchar,
\tdate,
\tforeignKey,
\tindex,
\tnumeric,
\tpgTable,
\tsmallint,
\ttext,
\ttimestamp,
\tvarchar,
} from "drizzle-orm/pg-core";
import { cfop } from "./cfop.js";
import { motivorebaixa } from "./motivo-rebaixa.js";
import { ncm } from "./ncm.js";
import { notafiscal } from "./nota-fiscal.js";
import { produtos } from "./produtos.js";
import { unidademedida } from "./unidade-medida.js";
import { usuarios } from "./usuarios.js";

export const notafiscalitem = pgTable(
\t"notafiscalitem",
\t{
${lines.join("\n")}
\t},
\t(table) => [
\t\tindex("notafiscalitem_idnotafiscal_idx").using(
\t\t\t"btree",
\t\t\ttable.idnotafiscal.asc().nullsLast().op("text_ops"),
\t\t),
\t\tindex("notafiscalitem_idproduto_idx").using(
\t\t\t"btree",
\t\t\ttable.idproduto.asc().nullsLast().op("text_ops"),
\t\t),
\t\tforeignKey({
\t\t\tcolumns: [table.idnotafiscal],
\t\t\tforeignColumns: [notafiscal.id],
\t\t\tname: "fk_notafiscalitem_notafiscal",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("cascade"),
\t\tforeignKey({
\t\t\tcolumns: [table.idproduto],
\t\t\tforeignColumns: [produtos.id],
\t\t\tname: "fk_notafiscalitem_produto",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idprodutokit],
\t\t\tforeignColumns: [produtos.id],
\t\t\tname: "fk_notafiscalitem_produtokit",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idcfop],
\t\t\tforeignColumns: [cfop.id],
\t\t\tname: "fk_notafiscalitem_cfop",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idncm],
\t\t\tforeignColumns: [ncm.id],
\t\t\tname: "fk_nfitem_ncm",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idunidademedida],
\t\t\tforeignColumns: [unidademedida.id],
\t\t\tname: "fk_nfitem_unidademedida",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idunidademedidatributavel],
\t\t\tforeignColumns: [unidademedida.id],
\t\t\tname: "fk_nfitem_unidademedida_trib",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idmotivorebaixa],
\t\t\tforeignColumns: [motivorebaixa.id],
\t\t\tname: "fk_notafiscalitem_motrebaixa",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idusuariodesconto],
\t\t\tforeignColumns: [usuarios.id],
\t\t\tname: "fk_nfitem_usuariodesconto",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idsupervisorvenda],
\t\t\tforeignColumns: [usuarios.id],
\t\t\tname: "fk_nfitem_usuariopreco",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idusuarioretirada],
\t\t\tforeignColumns: [usuarios.id],
\t\t\tname: "fk_nfitem_usuario_retirada",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idnotafiscalitemterceiros],
\t\t\tforeignColumns: [table.id],
\t\t\tname: "fk_nfitem_nfi_terc",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t\tforeignKey({
\t\t\tcolumns: [table.idnotafiscalitemdevolvido],
\t\t\tforeignColumns: [table.id],
\t\t\tname: "fk_nfitem_nfi_dev",
\t\t})
\t\t\t.onUpdate("cascade")
\t\t\t.onDelete("set null"),
\t],
);
`;

fs.writeFileSync("drizzle/tables/nota-fiscal-item.ts", out);
console.log(`Schema gerado com ${Object.keys(cols).length} colunas`);
