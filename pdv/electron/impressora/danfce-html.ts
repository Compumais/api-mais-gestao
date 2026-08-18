import {
	formatarChaveDanfce,
	formatarCnpjDanfce,
	formatarCpfDanfce,
	formatarDataHoraDanfce,
	formatarFoneDanfce,
	formatarMoedaDanfce,
	formatarProtocoloDanfce,
	formatarQtdeDanfce,
} from "./danfce-layout";
import type { DadosDanfce, EmitenteDanfce } from "./danfce-xml";

function escapeHtml(valor: string): string {
	return valor
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function linhaValor(label: string, valor: string, destaque = false): string {
	const cls = destaque ? ' class="pagar"' : "";
	return `<div class="row"${cls}><span>${escapeHtml(label)}</span><span>${escapeHtml(valor)}</span></div>`;
}

function enderecoEmitente(emitente: EmitenteDanfce): string {
	return [
		[emitente.logradouro, emitente.numero].filter(Boolean).join(", "),
		emitente.bairro,
		[emitente.municipio, emitente.uf].filter(Boolean).join("-"),
	]
		.map((p) => p?.trim())
		.filter(Boolean)
		.join(", ");
}

function consumidorHtml(dados: DadosDanfce): string {
	const c = dados.consumidor;
	if (!c?.documento && !c?.nome) {
		return "CONSUMIDOR NAO IDENTIFICADO";
	}
	if (c.tipo === "cnpj" && c.documento) {
		const nome = c.nome ? ` - ${c.nome}` : "";
		return `CONSUMIDOR - CNPJ ${formatarCnpjDanfce(c.documento)}${nome}`;
	}
	if (c.tipo === "cpf" && c.documento) {
		const nome = c.nome ? ` - ${c.nome}` : "";
		return `CONSUMIDOR - CPF ${formatarCpfDanfce(c.documento)}${nome}`;
	}
	return c.nome ? `CONSUMIDOR - ${c.nome}` : "CONSUMIDOR NAO IDENTIFICADO";
}

export function montarHtmlDanfce(dados: DadosDanfce, qrSvg?: string): string {
	const emit = dados.emitente;
	const ie = emit.ie ? ` | IE: ${emit.ie}` : "";
	const trib =
		dados.vTotTrib != null && dados.vTotTrib > 0
			? formatarMoedaDanfce(dados.vTotTrib)
			: "------";
	const numero = String(dados.numero || 0).padStart(9, "0");
	const serie = String(dados.serie || 0).padStart(3, "0");
	const dhEmi = dados.dhEmi ? ` ${formatarDataHoraDanfce(dados.dhEmi)}` : "";
	const infCpl = (dados.infCpl ?? "")
		.split(";")
		.map((t) => t.trim())
		.filter(Boolean)
		.map((t) => `<div>${escapeHtml(t)}</div>`)
		.join("");

	const itens = dados.itens
		.map((item) => {
			const valores = `${formatarQtdeDanfce(item.quantidade)} ${(item.unidade || "UN").slice(0, 4)} ${formatarMoedaDanfce(item.unitario)} ${formatarMoedaDanfce(item.total)}`;
			return `<div class="item"><div>${escapeHtml(item.codigo)} ${escapeHtml(item.descricao)}</div><div class="row"><span></span><span>${escapeHtml(valores)}</span></div></div>`;
		})
		.join("");

	const pags = dados.pagamentos
		.map((p) => linhaValor(p.tipo, formatarMoedaDanfce(p.valor)))
		.join("");

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: 80mm auto; margin: 2mm; }
  html, body {
    margin: 0; padding: 0; width: 76mm;
    background: #fff; color: #000;
  }
  .danfce {
    font-family: "Courier New", Courier, monospace;
    font-size: 10pt; line-height: 1.25;
    width: 76mm;
  }
  .center { text-align: center; }
  .nome { font-weight: 700; font-size: 11pt; }
  .dash {
    border: 0; border-top: 1px dashed #000;
    margin: 4px 0;
  }
  .row {
    display: flex; justify-content: space-between; gap: 6px;
  }
  .pagar { font-weight: 700; font-size: 11pt; }
  .item { margin-bottom: 2px; }
  .qr { display: block; width: 42mm; height: 42mm; margin: 6px auto; }
  .cab { font-weight: 700; }
</style>
</head>
<body>
<div class="danfce">
  <div class="center">
    <div class="nome">${escapeHtml(emit.nome || "EMITENTE")}</div>
    <div>CNPJ: ${escapeHtml(emit.cnpj ? formatarCnpjDanfce(emit.cnpj) : "—")}${escapeHtml(ie)}</div>
    ${enderecoEmitente(emit) ? `<div>${escapeHtml(enderecoEmitente(emit))}</div>` : ""}
    ${emit.fone ? `<div>Fone: ${escapeHtml(formatarFoneDanfce(emit.fone))}</div>` : ""}
  </div>
  <hr class="dash" />
  <div class="center">
    Documento Auxiliar da Nota Fiscal de Consumidor Eletronica<br/>
    Não permite aproveitamento de crédito de ICMS
    ${dados.contingencia ? "<br/><b>EMITIDA EM CONTINGÊNCIA</b>" : ""}
    ${dados.contingencia && dados.pendenteAutorizacao ? "<br/>Pendente de autorização" : ""}
    ${dados.homologacao ? "<br/><b>SEM VALOR FISCAL</b><br/>Emitida em ambiente de Homologacao" : ""}
  </div>
  <hr class="dash" />
  <div class="cab">Codigo Descricao Qtde UN Vl Unit Vl Total</div>
  ${itens}
  <hr class="dash" />
  ${linhaValor("Qtde total de itens", String(dados.itens.length))}
  ${linhaValor("Valor Total R$", formatarMoedaDanfce(dados.valorProdutos))}
  ${linhaValor("Desconto R$", formatarMoedaDanfce(dados.desconto))}
  ${linhaValor("Frete R$", formatarMoedaDanfce(dados.frete))}
  ${linhaValor("Valor a Pagar R$", formatarMoedaDanfce(dados.valorPagar), true)}
  <hr class="dash" />
  <div class="row cab"><span>FORMA PAGAMENTO</span><span>VALOR PAGO R$</span></div>
  ${pags}
  ${linhaValor("Troco R$", formatarMoedaDanfce(dados.troco))}
  <hr class="dash" />
  <div class="center">
    <b>Consulte pela Chave de Acesso em:</b><br/>
    ${dados.urlChave ? `${escapeHtml(dados.urlChave)}<br/>` : ""}
    ${dados.chave ? escapeHtml(formatarChaveDanfce(dados.chave)) : ""}
  </div>
  <hr class="dash" />
  <div class="center">
    ${escapeHtml(consumidorHtml(dados))}<br/>
    ${dados.consumidor?.endereco ? `${escapeHtml(dados.consumidor.endereco)}<br/>` : ""}
    <b>NFCe n. ${escapeHtml(numero)} Série ${escapeHtml(serie)}${escapeHtml(dhEmi)}</b><br/>
    ${dados.protocolo ? `Protocolo de Autorização: ${escapeHtml(formatarProtocoloDanfce(dados.protocolo))}<br/>` : ""}
    ${dados.dhAutorizacao ? `Data de Autorização: ${escapeHtml(formatarDataHoraDanfce(dados.dhAutorizacao))}` : ""}
  </div>
  <hr class="dash" />
  ${qrSvg ? `<img class="qr" alt="QR Code NFC-e" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}" />` : ""}
  <div class="center">Tributos totais Incidentes (Lei Federal 12.741/2012): R$ ${escapeHtml(trib)}</div>
  ${infCpl}
</div>
</body>
</html>`;
}
