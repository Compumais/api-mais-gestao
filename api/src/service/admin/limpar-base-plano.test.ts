import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	caminhoDentroDoDiretorio,
	ErroPlanoLimpeza,
	FILTRO_PAGAR,
	FILTRO_RECEBER,
	type FkLimpeza,
	montarPlanoLimpeza,
	resolverAlvosLimpeza,
} from "@/service/admin/limpar-base-plano.js";

function fk(
	parcial: Partial<FkLimpeza> & Pick<FkLimpeza, "childTable" | "parentTable">,
): FkLimpeza {
	return {
		childColumn: "idpai",
		parentColumn: "id",
		deleteRule: "NO ACTION",
		childNullable: false,
		...parcial,
	};
}

describe("resolverAlvosLimpeza", () => {
	it("separa contas a pagar e a receber", () => {
		const tabelas = new Set(["financeiro", "empresas"]);
		expect(resolverAlvosLimpeza(["pagar"], tabelas)).toEqual([
			{ tabela: "financeiro", filtro: FILTRO_PAGAR },
		]);
		expect(resolverAlvosLimpeza(["receber"], tabelas)).toEqual([
			{ tabela: "financeiro", filtro: FILTRO_RECEBER },
		]);
		expect(resolverAlvosLimpeza(["pagar", "receber"], tabelas)).toEqual([
			{ tabela: "financeiro" },
		]);
	});

	it("no modo tudo preserva empresa, usuários e assinatura", () => {
		expect(
			resolverAlvosLimpeza(
				["tudo", "produtos"],
				new Set(["empresas", "usuario_empresas", "assinaturas", "produtos"]),
			),
		).toEqual([{ tabela: "produtos" }]);
	});
});

describe("montarPlanoLimpeza", () => {
	it("apaga o item antes do pai e desvincula variação", () => {
		const passos = montarPlanoLimpeza({
			alvos: [{ tabela: "produtos" }, { tabela: "produto_kit_item" }],
			fks: [
				fk({
					childTable: "produto_kit_item",
					childColumn: "idproduto",
					parentTable: "produtos",
				}),
				fk({
					childTable: "produtos",
					childColumn: "idprodutopai",
					parentTable: "produtos",
					childNullable: true,
					deleteRule: "RESTRICT",
				}),
			],
		});
		const apagar = passos
			.filter((passo) => passo.tipo === "apagar")
			.map((passo) => passo.tabela);
		expect(apagar).toEqual(["produto_kit_item", "produtos"]);
		expect(passos).toContainEqual(
			expect.objectContaining({
				tipo: "anular-proprio",
				tabela: "produtos",
				coluna: "idprodutopai",
			}),
		);
	});

	it("anula vínculo opcional e remove item obrigatório", () => {
		const passos = montarPlanoLimpeza({
			alvos: [{ tabela: "produtos" }],
			fks: [
				fk({
					childTable: "notafiscalitem",
					childColumn: "idproduto",
					parentTable: "produtos",
					deleteRule: "SET NULL",
					childNullable: true,
				}),
				fk({
					childTable: "vendapdvitem",
					childColumn: "idproduto",
					parentTable: "produtos",
					deleteRule: "CASCADE",
				}),
			],
			tabelasComEmpresa: new Set(["produtos", "vendapdvitem"]),
		});
		expect(passos).toEqual([
			expect.objectContaining({
				tipo: "anular",
				tabela: "notafiscalitem",
				coluna: "idproduto",
			}),
			expect.objectContaining({
				tipo: "apagar-referencia",
				tabela: "vendapdvitem",
				coluna: "idproduto",
				restringirEmpresa: true,
			}),
			expect.objectContaining({ tipo: "apagar", tabela: "produtos" }),
		]);
	});

	it("pede o outro módulo quando o vínculo é obrigatório", () => {
		expect(() =>
			montarPlanoLimpeza({
				alvos: [{ tabela: "entidade" }],
				fks: [
					fk({
						childTable: "financeiro",
						childColumn: "identidade",
						parentTable: "entidade",
					}),
				],
			}),
		).toThrow(ErroPlanoLimpeza);
	});

	it("remove lotes do item antes do item e do DAV", () => {
		const passos = montarPlanoLimpeza({
			alvos: [{ tabela: "dav" }, { tabela: "davitemlote" }],
			fks: [
				fk({
					childTable: "davitem",
					childColumn: "iddav",
					parentTable: "dav",
				}),
				fk({
					childTable: "davitemlote",
					childColumn: "iddavitem",
					parentTable: "davitem",
				}),
			],
			tabelasComEmpresa: new Set(["dav", "davitemlote"]),
		});
		const tipos = passos.map((passo) =>
			passo.tipo === "apagar" || passo.tipo === "apagar-referencia"
				? `${passo.tipo}:${passo.tabela}`
				: passo.tipo,
		);
		expect(tipos.indexOf("apagar-referencia:davitemlote")).toBeGreaterThan(-1);
		expect(tipos.indexOf("apagar-referencia:davitemlote")).toBeLessThan(
			tipos.indexOf("apagar-referencia:davitem"),
		);
		expect(tipos.indexOf("apagar-referencia:davitem")).toBeLessThan(
			tipos.indexOf("apagar:dav"),
		);
	});

	it("aplica o filtro só nas contas do tipo escolhido", () => {
		const passos = montarPlanoLimpeza({
			alvos: [{ tabela: "financeiro", filtro: FILTRO_PAGAR }],
			fks: [
				fk({
					childTable: "financeirolancamento",
					childColumn: "idfinanceiro",
					parentTable: "financeiro",
					deleteRule: "CASCADE",
				}),
			],
		});
		const apagar = passos.find((passo) => passo.tipo === "apagar");
		expect(apagar).toMatchObject({ filtro: FILTRO_PAGAR });
		const referencia = passos.find(
			(passo) => passo.tipo === "apagar-referencia",
		);
		expect(
			referencia?.tipo === "apagar-referencia" && referencia.escopo,
		).toMatchObject({
			tipo: "empresa",
			filtro: FILTRO_PAGAR,
		});
	});
});

describe("caminhoDentroDoDiretorio", () => {
	const base = resolve(tmpdir(), "limpeza-base");

	it("aceita caminho relativo e recusa saída do diretório", () => {
		expect(caminhoDentroDoDiretorio(base, "abc/foto.jpg")).toBe(
			resolve(base, "abc/foto.jpg"),
		);
		expect(caminhoDentroDoDiretorio(base, "../segredo.txt")).toBeNull();
		expect(caminhoDentroDoDiretorio(base, "")).toBeNull();
	});
});
