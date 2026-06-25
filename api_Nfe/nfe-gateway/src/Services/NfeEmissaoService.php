<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\NFe\Complements;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Make;

final class NfeEmissaoService
{
	/**
	 * Emite uma NF-e com N itens reais (emissão de venda).
	 *
	 * @param array $configJson  Configuração sped-nfe (ambiente, UF, razão social, etc.)
	 * @param string $pfxBase64  Certificado A1 em base64
	 * @param string $senha      Senha do certificado
	 * @param array  $payloadNfe Payload completo: emitente, ide, destinatario, itens[], totais, pagamento
	 */
	public static function emitir(
		array $configJson,
		string $pfxBase64,
		string $senha,
		array $payloadNfe
	): array {
		$schema = (string) ($configJson['schemes'] ?? 'PL_009_V4');
		$mk = new Make($schema);
		$mk->setOnlyAscii(false);

		$emitente    = $payloadNfe['emitente']    ?? [];
		$ide         = $payloadNfe['ide']         ?? [];
		$destinatario = $payloadNfe['destinatario'] ?? [];
		$itens       = $payloadNfe['itens']        ?? [];
		$totais      = $payloadNfe['totais']       ?? [];
		$pagamento   = $payloadNfe['pagamento']    ?? [];
		$transporte  = $payloadNfe['transporte']   ?? [];
		$infoAdic    = $payloadNfe['informacoesAdicionais'] ?? '';
		$refs        = $payloadNfe['documentosReferenciados'] ?? [];

		$tpAmb = (int) ($ide['tpAmb'] ?? 2);
		$crt   = (int) ($emitente['crt'] ?? 3);
		$finNFe = (int) ($ide['finNFe'] ?? 1);
		$tpNF  = (int) ($ide['tpNF'] ?? 1);
		$mod   = (int) ($ide['mod'] ?? 55);
		$tpImp = (int) ($ide['tpImp'] ?? ($mod === 65 ? 4 : 1));

		// ── infNFe ─────────────────────────────────────────────────────────
		$mk->taginfNFe((object) ['versao' => $configJson['versao'] ?? '4.00']);

		// ── ide ─────────────────────────────────────────────────────────────
		$mk->tagide((object) [
			'cUF'    => (int) ($ide['cUF'] ?? 35),
			'natOp'  => ($natOp = trim((string) ($ide['natOp'] ?? ''))) !== '' ? $natOp : 'VENDA',
			'mod'    => $mod,
			'serie'  => (int) ($ide['serie'] ?? 1),
			'nNF'    => (int) ($ide['nNF'] ?? 1),
			'dhEmi'  => date('c'),
			'tpNF'   => $tpNF,
			'idDest' => (int) ($ide['idDest'] ?? 1),
			'cMunFG' => (int) ($emitente['codigoMunicipio'] ?? 3550308),
			'tpImp'  => $tpImp,
			'tpEmis' => 1,
			'tpAmb'  => $tpAmb,
			'finNFe' => $finNFe,
			'indFinal' => (int) ($ide['indFinal'] ?? 1),
			'indPres'  => (int) ($ide['indPres'] ?? 1),
			'procEmi'  => 0,
			'verProc'  => (string) ($ide['verProc'] ?? 'MaisGestao 1.0.0'),
		]);

		foreach ($refs as $ref) {
			$chaveRef = preg_replace('/\D/', '', (string) ($ref['refNFe'] ?? ''));
			if (strlen($chaveRef) === 44) {
				$mk->tagrefNFe((object) ['refNFe' => $chaveRef]);
			}
		}

		// ── emitente ────────────────────────────────────────────────────────
		$mk->tagemit((object) [
			'CNPJ'  => (string) ($emitente['cnpj'] ?? ''),
			'xNome' => (string) ($emitente['razaoSocial'] ?? ''),
			'xFant' => (string) ($emitente['nomeFantasia'] ?? ''),
			'IE'    => self::normalizarIeEmitente((string) ($emitente['ie'] ?? '')),
			'CRT'   => $crt,
		]);

		$mk->tagenderEmit((object) [
			'xLgr'   => (string) ($emitente['logradouro'] ?? ''),
			'nro'    => (string) ($emitente['numero'] ?? 'S/N'),
			'xCpl'   => (string) ($emitente['complemento'] ?? ''),
			'xBairro' => (string) ($emitente['bairro'] ?? ''),
			'cMun'   => (string) ($emitente['codigoMunicipio'] ?? ''),
			'xMun'   => (string) ($emitente['municipio'] ?? 'MUNICIPIO'),
			'UF'     => (string) ($emitente['uf'] ?? 'SP'),
			'CEP'    => (string) ($emitente['cep'] ?? ''),
			'cPais'  => '1058',
			'xPais'  => 'BRASIL',
			'fone'   => preg_replace('/\D/', '', (string) ($emitente['telefone'] ?? '')),
		]);

		// ── destinatário ────────────────────────────────────────────────────
		$cnpjDest = preg_replace('/\D/', '', (string) ($destinatario['cnpjcpf'] ?? ''));
		$isCnpj   = strlen($cnpjDest) === 14;
		$isCpf    = strlen($cnpjDest) === 11;

		$indIEDest = (int) ($destinatario['indIEDest'] ?? 9);
		$destObj = (object) [
			'xNome'     => (string) ($destinatario['razaosocial'] ?? 'CONSUMIDOR NAO IDENTIFICADO'),
			'indIEDest' => $indIEDest,
		];
		if ($tpAmb === 2) {
			// Homologação: CNPJ/nome padrão SEFAZ; IE real não pode ir com CNPJ fictício.
			$destObj->CNPJ      = '99999999000191';
			$destObj->xNome     = 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';
			$destObj->indIEDest = 9;
			$indIEDest          = 9;
		} elseif ($isCnpj) {
			$destObj->CNPJ = $cnpjDest;
		} elseif ($isCpf) {
			$destObj->CPF = $cnpjDest;
		} else {
			$destObj->CNPJ = '99999999000191';
		}
		$ieDest = self::normalizarIeDestinatario($indIEDest, $destinatario['ie'] ?? null);
		if ($ieDest !== null && $ieDest !== '') {
			$destObj->IE = $ieDest;
		}
		$mk->tagdest($destObj);

		if (!empty($destinatario['logradouro']) || $tpAmb === 2) {
			$mk->tagenderDest((object) [
				'xLgr'   => (string) ($destinatario['logradouro'] ?? 'RUA TESTE'),
				'nro'    => (string) ($destinatario['numero'] ?? '100'),
				'xBairro' => (string) ($destinatario['bairro'] ?? 'CENTRO'),
				'cMun'   => (string) ($destinatario['codigomunicipioibge'] ?? $emitente['codigoMunicipio'] ?? '3550308'),
				'xMun'   => (string) ($destinatario['cidade'] ?? 'MUNICIPIO'),
				'UF'     => (string) ($destinatario['estado'] ?? $emitente['uf'] ?? 'SP'),
				'CEP'    => preg_replace('/\D/', '', (string) ($destinatario['cep'] ?? '01001000')),
				'cPais'  => '1058',
				'xPais'  => 'BRASIL',
			]);
		}

		// ── itens ────────────────────────────────────────────────────────────
		$vProdTotal = 0;
		$vIcmsTotal = 0;
		$vBcTotal   = 0;
		$vBcStTotal = 0;
		$vStTotal   = 0;
		$vIpiTotal  = 0;
		$vIpiDevolTotal = 0;
		$vFcpStTotal = 0;
		$vFcpStRetTotal = 0;
		$vIcmsDesonTotal = 0;
		$vIcmsMonoRetTotal = 0;
		$vIcmsMonoRetenTotal = 0;
		$vPisTotal  = 0;
		$vCofinsTotal = 0;

		$vFreteTotal = (float) ($totais['frete'] ?? 0);
		$vSegTotal = (float) ($totais['seguro'] ?? 0);
		$vDescTotal = (float) ($totais['desconto'] ?? 0);
		$vOutroTotal = (float) ($totais['outrasDespesas'] ?? 0);
		$itens = self::distribuirValoresComerciaisNosItens($itens, [
			'frete' => $vFreteTotal,
			'seguro' => $vSegTotal,
			'desconto' => $vDescTotal,
			'outrasDespesas' => $vOutroTotal,
		]);

		$vFreteSomadoItens = 0.0;
		$vSegSomadoItens = 0.0;
		$vDescSomadoItens = 0.0;
		$vOutroSomadoItens = 0.0;

		foreach ($itens as $idx => $item) {
			$nItem  = $idx + 1;
			$qCom   = (float) ($item['quantidade'] ?? 1);
			$vUnCom = (float) ($item['valorUnitario'] ?? 0);
			$vProd  = round($qCom * $vUnCom, 2);
			$vProdTotal += $vProd;

			$gtin = self::resolverGtin(
				isset($item['ean']) ? (string) $item['ean'] : null,
				isset($item['eanTributavel']) ? (string) $item['eanTributavel'] : null,
			);

			$vFreteItem = (float) ($item['vFrete'] ?? 0);
			$vSegItem = (float) ($item['vSeg'] ?? 0);
			$vDescItem = (float) ($item['vDesc'] ?? 0);
			$vOutroItem = (float) ($item['vOutro'] ?? 0);
			$vFreteSomadoItens = round($vFreteSomadoItens + $vFreteItem, 2);
			$vSegSomadoItens = round($vSegSomadoItens + $vSegItem, 2);
			$vDescSomadoItens = round($vDescSomadoItens + $vDescItem, 2);
			$vOutroSomadoItens = round($vOutroSomadoItens + $vOutroItem, 2);

			$prod = (object) [
				'item'   => $nItem,
				'cProd'  => (string) ($item['codigoProduto'] ?? str_pad((string) $nItem, 6, '0', STR_PAD_LEFT)),
				'cEAN'   => $gtin['cEAN'],
				'xProd'  => (string) ($item['descricao'] ?? 'PRODUTO'),
				'NCM'    => (string) ($item['ncm'] ?? '00000000'),
				'CFOP'   => (string) ($item['cfop'] ?? '5102'),
				'uCom'   => (string) ($item['unidade'] ?? 'UN'),
				'qCom'   => $qCom,
				'vUnCom' => $vUnCom,
				'vProd'  => $vProd,
				'cEANTrib' => $gtin['cEANTrib'],
				'uTrib'  => (string) ($item['unidade'] ?? 'UN'),
				'qTrib'  => $qCom,
				'vUnTrib' => $vUnCom,
				'indTot' => 1,
			];
			$mk->tagprod(self::anexarValoresComerciaisProd(
				$prod,
				$vFreteItem,
				$vSegItem,
				$vDescItem,
				$vOutroItem,
			));

			$mk->tagimposto((object) ['item' => $nItem]);

			$csosn = trim((string) ($item['csosn'] ?? ''));
			$cst   = trim((string) ($item['cst'] ?? ''));
			$orig  = (int) ($item['orig'] ?? 0);

			if (in_array($crt, [1, 2, 4], true)) {
				if ($csosn === '' && $cst !== '' && preg_match('/^[1259]\d{2}$/', $cst)) {
					$csosn = $cst;
				}
				if ($csosn === '') {
					$csosn = '102';
				}

				$mk->tagICMSSN((object) [
					'item'  => $nItem,
					'orig'  => $orig,
					'CSOSN' => $csosn,
				]);
			} else {
				$cstIcms = !empty($cst) ? $cst : '00';
				$vBC     = (float) ($item['baseIcms'] ?? $vProd);
				$pICMS   = (float) ($item['aliquotaIcms'] ?? 0);
				$vICMS   = array_key_exists('valorIcms', $item)
					? round((float) $item['valorIcms'], 2)
					: round($vBC * $pICMS / 100, 2);
				if ($pICMS <= 0 && $vBC > 0 && $vICMS > 0) {
					$pICMS = round($vICMS / $vBC * 100, 4);
				}
				$vIcmsTotal += $vICMS;
				$vBcTotal += $vBC;
				$mk->tagICMS((object) [
					'item'  => $nItem,
					'orig'  => $orig,
					'CST'   => $cstIcms,
					'modBC' => 3,
					'vBC'   => $vBC,
					'pICMS' => $pICMS,
					'vICMS' => $vICMS,
				]);
			}

			$vIPI = round((float) ($item['valorIpi'] ?? 0), 2);
			if ($vIPI > 0) {
				$vIpiTotal += $vIPI;
				$mk->tagIPI((object) ['item' => $nItem, 'cEnq' => '999']);
				$mk->tagIPITrib((object) [
					'item' => $nItem,
					'CST'  => '50',
					'vBC'  => $vProd,
					'pIPI' => round($vIPI / max($vProd, 0.01) * 100, 4),
					'vIPI' => $vIPI,
				]);
			}

			$vIpiDevol = round((float) ($item['valorIpiDevol'] ?? 0), 2);
			if ($vIpiDevol > 0) {
				$vIpiDevolTotal += $vIpiDevol;
				$mk->tagimpostoDevol((object) [
					'item'      => $nItem,
					'pDevol'    => 100.00,
					'vIPIDevol' => $vIpiDevol,
				]);
			}

			$vBcSt = round((float) ($item['baseIcmsSt'] ?? 0), 2);
			$vST   = round((float) ($item['valorIcmsSt'] ?? 0), 2);
			$vFcpSt = round((float) ($item['valorFcpSt'] ?? 0), 2);
			$vFcpStRet = round((float) ($item['valorFcpStRet'] ?? 0), 2);
			$vIcmsDeson = round((float) ($item['valorIcmsDesonerado'] ?? 0), 2);
			$vIcmsMonoRet = round((float) ($item['valorIcmsMonoRet'] ?? 0), 2);
			$vIcmsMonoReten = round((float) ($item['valorIcmsMonoReten'] ?? 0), 2);

			$vBcStTotal += $vBcSt;
			$vStTotal += $vST;
			$vFcpStTotal += $vFcpSt;
			$vFcpStRetTotal += $vFcpStRet;
			$vIcmsDesonTotal += $vIcmsDeson;
			$vIcmsMonoRetTotal += $vIcmsMonoRet;
			$vIcmsMonoRetenTotal += $vIcmsMonoReten;

			$cstPis  = (string) ($item['cstPis'] ?? '07');
			$cstCof  = (string) ($item['cstCofins'] ?? '07');
			$pPis    = (float) ($item['aliquotaPis'] ?? 0);
			$pCofins = (float) ($item['aliquotaCofins'] ?? 0);
			$vPis    = round($vProd * $pPis / 100, 2);
			$vCofins = round($vProd * $pCofins / 100, 2);
			$vPisTotal  += $vPis;
			$vCofinsTotal += $vCofins;

			if (in_array($cstPis, ['01', '02', '03'], true)) {
				$mk->tagPIS((object) [
					'item'  => $nItem,
					'CST'   => $cstPis,
					'vBC'   => $vProd,
					'pPIS'  => $pPis,
					'vPIS'  => $vPis,
				]);
			} else {
				$mk->tagPIS((object) [
					'item'  => $nItem,
					'CST'   => $cstPis,
					'vBC'   => 0,
					'pPIS'  => 0,
					'vPIS'  => 0,
				]);
			}

			if (in_array($cstCof, ['01', '02', '03'], true)) {
				$mk->tagCOFINS((object) [
					'item'    => $nItem,
					'CST'     => $cstCof,
					'vBC'     => $vProd,
					'pCOFINS' => $pCofins,
					'vCOFINS' => $vCofins,
				]);
			} else {
				$mk->tagCOFINS((object) [
					'item'    => $nItem,
					'CST'     => $cstCof,
					'vBC'     => 0,
					'pCOFINS' => 0,
					'vCOFINS' => 0,
				]);
			}
		}

		// ── totais ────────────────────────────────────────────────────────────
		$vFrete   = $vFreteSomadoItens;
		$vSeg     = $vSegSomadoItens;
		$vDesc    = $vDescSomadoItens;
		$vOutro   = $vOutroSomadoItens;
		$vNF      = round(
			$vProdTotal + $vFrete + $vSeg + $vOutro - $vDesc + $vIpiTotal + $vIpiDevolTotal + $vStTotal + $vFcpStTotal,
			2
		);

		$mk->tagICMSTot((object) [
			'vBC'        => round($vBcTotal, 2),
			'vICMS'      => round($vIcmsTotal, 2),
			'vICMSDeson' => round($vIcmsDesonTotal, 2),
			'vFCP'       => 0,
			'vBCST'      => round($vBcStTotal, 2),
			'vST'        => round($vStTotal, 2),
			'vFCPST'     => round($vFcpStTotal, 2),
			'vFCPSTRet'  => round($vFcpStRetTotal, 2),
			'vProd'      => round($vProdTotal, 2),
			'vFrete'     => $vFrete,
			'vSeg'       => $vSeg,
			'vDesc'      => $vDesc,
			'vII'        => 0,
			'vIPI'       => round($vIpiTotal, 2),
			'vIPIDevol'  => round($vIpiDevolTotal, 2),
			'vPIS'       => round($vPisTotal, 2),
			'vCOFINS'    => round($vCofinsTotal, 2),
			'vOutro'     => $vOutro,
			'vNF'        => $vNF,
		]);

		// ── transporte ───────────────────────────────────────────────────────
		$modFrete = (int) ($transporte['modFrete'] ?? 9);
		if ($vFrete > 0 && $modFrete === 9) {
			$modFrete = 0;
		}

		$mk->tagtransp((object) [
			'modFrete' => $modFrete,
		]);

		// ── pagamento ────────────────────────────────────────────────────────
		$mk->tagpag((object) []);
		$formasPag = $pagamento['formas'] ?? [['tPag' => '01', 'vPag' => $vNF]];
		foreach ($formasPag as $pag) {
			$tPag = (string) ($pag['tPag'] ?? '01');
			$detPag = ['tPag' => $tPag];

			if ($tPag === '90') {
				$detPag['vPag'] = 0.0;
			} else {
				$detPag['indPag'] = (int) ($pag['indPag'] ?? 0);
				$detPag['vPag'] = (float) ($pag['vPag'] ?? $vNF);
			}

			$mk->tagdetPag((object) $detPag);
		}

		// ── informações adicionais ────────────────────────────────────────────
		if (!empty($infoAdic)) {
			$mk->taginfAdic((object) ['infCpl' => mb_substr((string) $infoAdic, 0, 2000)]);
		}

		// ── montar e assinar ─────────────────────────────────────────────────
		$xml = $mk->getXML();
		$erros = $mk->getErrors();
		if (!empty($erros)) {
			throw new \RuntimeException('Erros ao montar XML: ' . implode('; ', $erros));
		}

		$tools      = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
		$xmlAssinado = $tools->signNFe($xml);

		$idLote  = str_pad((string) random_int(1, 99999999), 15, '0', STR_PAD_LEFT);
		$retorno = $tools->sefazEnviaLote([$xmlAssinado], $idLote, 1);

		$std    = new Standardize($retorno);
		$resp   = $std->toStd();
		$cStatLote = (string) ($resp->cStat ?? '');
		$xMotivoLote = (string) ($resp->xMotivo ?? '');
		$cStat  = $cStatLote;
		$xMotivo = $xMotivoLote;
		$protocolo  = '';
		$chave      = '';
		$xmlAutorizado = '';

		$infProt = self::extrairInfProt($resp);
		if ($infProt !== null) {
			$cStat    = (string) ($infProt->cStat ?? $cStatLote);
			$xMotivo  = (string) ($infProt->xMotivo ?? $xMotivoLote);
			$protocolo = (string) ($infProt->nProt ?? '');
			$chave     = (string) ($infProt->chNFe ?? '');
		}

		if ($cStat === '100') {
			try {
				$xmlAutorizado = Complements::toAuthorize($xmlAssinado, $retorno);
			} catch (\Throwable $e) {
				$xmlAutorizado = $retorno;
			}
		}

		if ($chave === '' && preg_match('/Id="NFe(\d{44})"/', $xmlAssinado, $m)) {
			$chave = $m[1];
		}

		return [
			'xmlEnviado'  => $xmlAssinado,
			'xmlRetorno'  => $xmlAutorizado !== '' ? $xmlAutorizado : $retorno,
			'chave'       => $chave,
			'cStat'       => $cStat,
			'cStatLote'   => $cStatLote,
			'xMotivo'     => $xMotivo,
			'protocolo'   => $protocolo,
		];
	}

	/**
	 * @return array{cEAN: string, cEANTrib: string}
	 */
	private static function resolverGtin(?string $ean, ?string $eanTributavel): array
	{
		$ean = trim((string) ($ean ?? ''));
		$eanTributavel = trim((string) ($eanTributavel ?? ''));

		if ($ean === '' || strcasecmp($ean, 'SEM GTIN') === 0) {
			return ['cEAN' => 'SEM GTIN', 'cEANTrib' => 'SEM GTIN'];
		}

		$cEANTrib =
			$eanTributavel !== '' && strcasecmp($eanTributavel, 'SEM GTIN') !== 0
				? $eanTributavel
				: $ean;

		return ['cEAN' => $ean, 'cEANTrib' => $cEANTrib];
	}

	/**
	 * @param object $resp
	 */
	private static function extrairInfProt($resp): ?object
	{
		if (!isset($resp->protNFe)) {
			return null;
		}

		$protNFe = $resp->protNFe;
		if (is_array($protNFe)) {
			$protNFe = $protNFe[0] ?? null;
		}

		if ($protNFe === null) {
			return null;
		}

		if (isset($protNFe->infProt)) {
			return $protNFe->infProt;
		}

		return is_object($protNFe) ? $protNFe : null;
	}

	private static function normalizarIeEmitente(string $ie): string
	{
		$ie = trim($ie);
		if ($ie === '') {
			return '';
		}

		$upper = mb_strtoupper($ie);
		if ($upper === 'ISENTO' || $upper === 'ISENTA') {
			return 'ISENTO';
		}

		return preg_replace('/\D/', '', $ie) ?? '';
	}

	private static function normalizarIeDestinatario(int $indIEDest, mixed $ie): ?string
	{
		if ($indIEDest === 2 || $indIEDest === 9) {
			return null;
		}

		$texto = trim((string) $ie);
		if ($texto === '') {
			return null;
		}

		$upper = mb_strtoupper($texto);
		if ($upper === 'ISENTO' || $upper === 'ISENTA') {
			return 'ISENTO';
		}

		$digitos = preg_replace('/\D/', '', $texto);
		return ($digitos !== null && $digitos !== '') ? $digitos : null;
	}

	/**
	 * vFrete, vSeg, vDesc e vOutro no item não aceitam 0.00 no XSD — omitir quando zero.
	 */
	private static function anexarValoresComerciaisProd(
		object $prod,
		float $vFrete,
		float $vSeg,
		float $vDesc,
		float $vOutro,
	): object {
		if ($vFrete > 0) {
			$prod->vFrete = $vFrete;
		}
		if ($vSeg > 0) {
			$prod->vSeg = $vSeg;
		}
		if ($vDesc > 0) {
			$prod->vDesc = $vDesc;
		}
		if ($vOutro > 0) {
			$prod->vOutro = $vOutro;
		}

		return $prod;
	}

	/**
	 * @param array<int, array<string, mixed>> $itens
	 * @param array{frete: float, seguro: float, desconto: float, outrasDespesas: float} $totaisComerciais
	 * @return array<int, array<string, mixed>>
	 */
	private static function distribuirValoresComerciaisNosItens(
		array $itens,
		array $totaisComerciais
	): array {
		$quantidade = count($itens);
		if ($quantidade === 0) {
			return $itens;
		}

		$pesos = [];
		$pesoTotal = 0.0;
		foreach ($itens as $item) {
			$peso = round(
				(float) ($item['quantidade'] ?? 1) * (float) ($item['valorUnitario'] ?? 0),
				2
			);
			$pesos[] = $peso;
			$pesoTotal += $peso;
		}

		if ($pesoTotal <= 0) {
			$pesoTotal = (float) $quantidade;
			$pesos = array_fill(0, $quantidade, 1.0);
		}

		$resultado = [];
		$acumulado = [
			'frete' => 0.0,
			'seguro' => 0.0,
			'desconto' => 0.0,
			'outrasDespesas' => 0.0,
		];

		foreach ($itens as $indice => $item) {
			$isUltimo = $indice === $quantidade - 1;
			$proporcao = $pesos[$indice] / $pesoTotal;
			$valoresItem = [];

			foreach ($acumulado as $campo => $acumuladoCampo) {
				$totalCampo = (float) ($totaisComerciais[$campo] ?? 0);
				if ($totalCampo <= 0) {
					$valoresItem[$campo] = 0.0;
					continue;
				}

				$valor = $isUltimo
					? round($totalCampo - $acumuladoCampo, 2)
					: round($totalCampo * $proporcao, 2);
				$acumulado[$campo] = round($acumuladoCampo + $valor, 2);
				$valoresItem[$campo] = $valor;
			}

			$resultado[] = array_merge($item, [
				'vFrete' => $valoresItem['frete'],
				'vSeg' => $valoresItem['seguro'],
				'vDesc' => $valoresItem['desconto'],
				'vOutro' => $valoresItem['outrasDespesas'],
			]);
		}

		return $resultado;
	}
}
