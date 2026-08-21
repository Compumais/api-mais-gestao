import { describe, expect, it } from "vitest";
import {
	calcularBaseIcmsSt,
	calcularIcmsStItemEmissao,
	calcularValorFcpSt,
	calcularValorIcmsSt,
	recalcularIcmsStItemEmissao,
	recalcularIcmsStItensEmissao,
} from "@/util/calcular-icms-st-item-emissao-nfe.js";
import { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import { montarPisItemNfe } from "@/util/montar-grupo-pis-cofins-item-nfe.js";
import { resolverCreditoIcmsSnItem } from "@/util/resolver-credito-icms-sn-item.js";
import { validarCoerenciaFiscalNfe } from "@/service/fiscal/validar-coerencia-fiscal-nfe.js";

describe("contrato fiscal painel × DANFE", () => {
	it("Simples + CSOSN 202 + MVA 61,05%: BC 692,53 / ST 47,25 / vNF 477,25", () => {
		const itens = [
			{ quantidade: 3, valorUnitario: 25 },
			{ quantidade: 2, valorUnitario: 45 },
			{ quantidade: 3, valorUnitario: 45 },
			{ quantidade: 1, valorUnitario: 60 },
			{ quantidade: 1, valorUnitario: 70 },
		].map((parcial) =>
			recalcularIcmsStItemEmissao({
				descricao: "Cachaça",
				ncm: "22084000",
				cest: "0200400",
				cfop: "5401",
				unidade: "UN",
				csosn: "202",
				percentualMvaSt: 61.05,
				aliquotaIcmsSt: 18,
				aliquotaIcmsProprioSt: 18,
				...parcial,
			}),
		);

		const totais = calcularTotaisFiscaisEmissaoNfe(1, itens, {});

		expect(totais.baseIcmsSt).toBe(692.53);
		expect(totais.valorIcmsSt).toBe(47.25);
		expect(totais.totalProdutos).toBe(430);
		expect(totais.totalNota).toBe(477.25);
		expect(totais.baseIcms).toBe(0);
		expect(totais.valorIcms).toBe(0);
	});

	it("CST PIS 03 calcula por quantidade", () => {
		const pis = montarPisItemNfe({
			cstPis: "03",
			aliquotaPis: 0.65,
			valorProduto: 100,
			quantidade: 10,
		});

		expect(pis.vPIS).toBe(6.5);
		expect(pis.qBCProd).toBe(10);
		expect(pis.vAliqProd).toBe(0.65);
	});

	it("ST + FCP ST calcula valorFcpSt pela base ST", () => {
		const item = recalcularIcmsStItemEmissao({
			descricao: "Produto ST",
			ncm: "22084000",
			cest: "0200400",
			cfop: "5401",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 100,
			csosn: "202",
			percentualMvaSt: 40,
			aliquotaIcmsSt: 18,
			aliquotaIcmsProprioSt: 18,
			aliquotaFcpSt: 2,
		});

		expect(item.baseIcmsSt).toBe(140);
		expect(item.valorIcmsSt).toBe(7.2);
		expect(item.valorFcpSt).toBe(2.8);
		expect(calcularValorFcpSt({ baseIcmsSt: 140, aliquotaFcpSt: 2 })).toBe(2.8);
	});

	it("CSOSN 101 resolve crédito SN sem usar aliquotaIcms de ST", () => {
		const credito = resolverCreditoIcmsSnItem({
			csosn: "101",
			valorProduto: 200,
			pCredSN: 1.25,
			aliquotaIcmsInterna: 18,
		});

		expect(credito.pCredSN).toBe(1.25);
		expect(credito.vCredICMSSN).toBe(2.5);
	});

	it("CRT 3 destaca ICMS próprio nos totais", () => {
		const totais = calcularTotaisFiscaisEmissaoNfe(
			3,
			[
				{
					quantidade: 2,
					valorUnitario: 50,
					cst: "00",
					baseIcms: 100,
					aliquotaIcms: 18,
					valorIcms: 18,
				},
			],
			{},
		);

		expect(totais.baseIcms).toBe(100);
		expect(totais.valorIcms).toBe(18);
		expect(totais.totalNota).toBe(100);
	});

	it("bloqueia ST sem alíquota interna e ST divergente", () => {
		const semAliquota = validarCoerenciaFiscalNfe({
			crt: 1,
			idDest: 1,
			itens: [
				{
					descricao: "Item",
					ncm: "22084000",
					cest: "0200400",
					cfop: "5401",
					unidade: "UN",
					quantidade: 1,
					valorUnitario: 8,
					csosn: "202",
					percentualMvaSt: 61.05,
					aliquotaIcmsSt: 18,
					baseIcmsSt: 12.88,
					valorIcmsSt: 2.32,
				},
			],
		});

		expect(
			semAliquota.some((v) => v.code === "ST_SEM_ALIQUOTA_INTERNA"),
		).toBe(true);
		expect(
			semAliquota.find((v) => v.code === "ST_SEM_ALIQUOTA_INTERNA")?.status,
		).toBe("INCONSISTENCIA");

		const divergente = validarCoerenciaFiscalNfe({
			crt: 1,
			idDest: 1,
			itens: [
				{
					descricao: "Item",
					ncm: "22084000",
					cest: "0200400",
					cfop: "5401",
					unidade: "UN",
					quantidade: 1,
					valorUnitario: 8,
					csosn: "202",
					percentualMvaSt: 61.05,
					aliquotaIcmsSt: 18,
					aliquotaIcmsProprioSt: 18,
					baseIcmsSt: 12.88,
					valorIcmsSt: 2.32,
				},
			],
		});

		expect(divergente.some((v) => v.code === "ST_VALOR_DIVERGENTE")).toBe(true);
		expect(
			divergente.find((v) => v.code === "ST_VALOR_DIVERGENTE")?.status,
		).toBe("INCONSISTENCIA");
	});

	it("deduz ICMS próprio com aliquotaIcmsProprioSt (NF 54: 0,88)", () => {
		const base = calcularBaseIcmsSt(8, 61.05);
		const valor = calcularValorIcmsSt({
			vProd: 8,
			baseIcmsSt: base,
			aliquotaIcmsSt: 18,
			aliquotaIcmsProprio: 18,
		});
		expect(base).toBe(12.88);
		expect(valor).toBe(0.88);

		const item = recalcularIcmsStItensEmissao([
			{
				descricao: "Produto",
				ncm: "22084000",
				cfop: "5401",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 8,
				csosn: "202",
				percentualMvaSt: 61.05,
				aliquotaIcmsSt: 18,
				aliquotaIcmsProprioSt: 18,
				valorIcmsSt: 2.32,
			},
		])[0];

		expect(item?.valorIcmsSt).toBe(0.88);
		expect(
			calcularIcmsStItemEmissao({
				quantidade: 1,
				valorUnitario: 8,
				csosn: "202",
				percentualMvaSt: 61.05,
				aliquotaIcmsSt: 18,
				aliquotaIcmsProprioSt: 18,
			}).valorIcmsSt,
		).toBe(0.88);
	});
});
