import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decidirInboundWhatsapp } from "./whatsapp-conversa-regras";

describe("decidirInboundWhatsapp", () => {
	it("grava na conversa do pedido aberto, mesmo com avulsa do mesmo telefone", () => {
		const destino = decidirInboundWhatsapp({
			contaAberta: { id: "conta-2" },
			conversaDaConta: { id: "conv-pedido-2", status: "aberta" },
			conversaAvulsaAberta: { id: "conv-avulsa" },
		});
		assert.deepEqual(destino, { acao: "usar", id: "conv-pedido-2" });
	});

	it("cria conversa nova para o pedido quando ainda não existe thread", () => {
		const destino = decidirInboundWhatsapp({
			contaAberta: { id: "conta-nova" },
			conversaDaConta: null,
			conversaAvulsaAberta: { id: "conv-pedido-antigo" },
		});
		assert.deepEqual(destino, { acao: "criar", idconta: "conta-nova" });
	});

	it("não reabre conversa do pedido já entregue", () => {
		const destino = decidirInboundWhatsapp({
			contaAberta: { id: "conta-entregue" },
			conversaDaConta: { id: "conv-entregue", status: "finalizada" },
			conversaAvulsaAberta: null,
		});
		assert.deepEqual(destino, { acao: "criar", idconta: null });
	});

	it("sem pedido aberto, usa conversa avulsa já aberta", () => {
		const destino = decidirInboundWhatsapp({
			contaAberta: null,
			conversaDaConta: { id: "conv-entregue", status: "finalizada" },
			conversaAvulsaAberta: { id: "conv-avulsa" },
		});
		assert.deepEqual(destino, { acao: "usar", id: "conv-avulsa" });
	});

	it("sem pedido e sem avulsa, cria conversa avulsa", () => {
		const destino = decidirInboundWhatsapp({
			contaAberta: null,
			conversaDaConta: null,
			conversaAvulsaAberta: null,
		});
		assert.deepEqual(destino, { acao: "criar", idconta: null });
	});
});
