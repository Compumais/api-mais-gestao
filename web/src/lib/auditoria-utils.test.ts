import { describe, expect, it } from "vitest";
import {
	formatarAcaoAuditoria,
	formatarRecursoAuditoria,
} from "./auditoria-utils";

describe("formatarAcaoAuditoria", () => {
	it("mapeia ações de criação", () => {
		expect(formatarAcaoAuditoria("criar_conta_mesa_item")).toBe("Criação");
		expect(formatarAcaoAuditoria("registrar_custo_nf")).toBe("Criação");
		expect(formatarAcaoAuditoria("Criar Plano de Contas")).toBe("Criação");
	});

	it("mapeia ações de exclusão", () => {
		expect(formatarAcaoAuditoria("excluir_banco")).toBe("Deletar");
	});

	it("mapeia ações de edição", () => {
		expect(formatarAcaoAuditoria("atualizar_produto")).toBe("Editar");
	});
});

describe("formatarRecursoAuditoria", () => {
	it("formata recursos em snake_case", () => {
		expect(formatarRecursoAuditoria("conta_corrente_lancamento")).toBe(
			"Conta Corrente Lancamento",
		);
	});

	it("formata recursos com espaços", () => {
		expect(formatarRecursoAuditoria("Plano de Contas")).toBe(
			"Plano De Contas",
		);
	});
});
