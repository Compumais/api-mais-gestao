<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use MaisGestao\NfeGateway\Fiscal\MontarIbsCbsItemNfe;
use MaisGestao\NfeGateway\Fiscal\MontarPisCofinsItemNfe;
use MaisGestao\NfeGateway\Fiscal\MontarRastroItemNfe;
use NFePHP\NFe\Complements;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Make;

final class NfeEmissaoService
{
	/** CNPJ padrão SEFAZ para ambiente de homologação (não usar em NFC-e de produção). */
	public const CNPJ_DESTINATARIO_HOMOLOGACAO = '99999999000191';

	/**
	 * NFC-e em produção sem consumidor identificado deve omitir o grupo dest.
	 */
	public static function deveOmitirDestinatarioNfce(
		int $mod,
		int $tpAmb,
		?string $cnpjCpf,
	): bool {
		if ($mod !== 65) {
			return false;
		}
		if ($tpAmb === 2) {
			return false;
		}

		return !self::documentoDestinatarioIdentificado($cnpjCpf);
	}

	public static function documentoDestinatarioIdentificado(?string $cnpjCpf): bool
	{
		$doc = preg_replace('/\D/', '', (string) ($cnpjCpf ?? '')) ?? '';
		if ($doc === '' || $doc === self::CNPJ_DESTINATARIO_HOMOLOGACAO) {
			return false;
		}

		return strlen($doc) === 11 || strlen($doc) === 14;
	}

	/**
	 * Monta e assina o XML da NF-e sem transmitir à SEFAZ.
	 *
	 * @param array<string, mixed> $configJson
	 * @param array<string, mixed> $payloadNfe
	 * @return array{xmlAssinado: string, mod: int}
	 */
	public static function montarXmlAssinado(
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
		$localEntrega = $payloadNfe['localEntrega'] ?? null;
		$enderecoEntrega = $payloadNfe['enderecoEntrega'] ?? null;
		$infoAdic    = $payloadNfe['informacoesAdicionais'] ?? '';
		$refs        = $payloadNfe['documentosReferenciados'] ?? [];

		$tpAmb = (int) ($ide['tpAmb'] ?? 2);
		$crt   = (int) ($emitente['crt'] ?? 3);
		$infoAdic = self::resolverInformacoesAdicionaisSimples(
			$crt,
			(string) $infoAdic,
			is_array($itens) ? $itens : [],
		);
		$finNFe = (int) ($ide['finNFe'] ?? 1);
		$tpNF  = (int) ($ide['tpNF'] ?? 1);
		$mod   = (int) ($ide['mod'] ?? $configJson['modelo'] ?? 55);
		$tpImp = (int) ($ide['tpImp'] ?? ($mod === 65 ? 4 : 1));

		$dhEmi = trim((string) ($ide['dhEmi'] ?? ''));
		if ($dhEmi === '') {
			$tz = new \DateTimeZone('America/Sao_Paulo');
			$dhEmi = (new \DateTimeImmutable('now', $tz))->format('Y-m-d\TH:i:sP');
		} else {
			// XSD do dhEmi não aceita milissegundos (ex.: .464)
			$dhEmi = preg_replace('/\.\d+(?=[+-]\d{2}:\d{2}$)/', '', $dhEmi) ?? $dhEmi;
		}

		// ── infNFe ─────────────────────────────────────────────────────────
		$mk->taginfNFe((object) ['versao' => $configJson['versao'] ?? '4.00']);

		// ── ide ─────────────────────────────────────────────────────────────
		$mk->tagide((object) [
			'cUF'    => (int) ($ide['cUF'] ?? 35),
			'natOp'  => ($natOp = trim((string) ($ide['natOp'] ?? ''))) !== '' ? $natOp : 'VENDA',
			'mod'    => $mod,
			'serie'  => (int) ($ide['serie'] ?? 1),
			'nNF'    => (int) ($ide['nNF'] ?? 1),
			'dhEmi'  => $dhEmi,
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
		// NFC-e (mod. 65) em produção sem CPF/CNPJ: omitir o grupo dest (MOC/NT).
		// Não usar CNPJ fictício 99999999000191 em cupom de produção.
		$documentoDest = preg_replace('/\D/', '', (string) ($destinatario['cnpjcpf'] ?? '')) ?? '';
		if (!self::deveOmitirDestinatarioNfce($mod, $tpAmb, $documentoDest)) {
			$isCnpj = strlen($documentoDest) === 14;
			$isCpf  = strlen($documentoDest) === 11;
			$documentoIdentificado = self::documentoDestinatarioIdentificado($documentoDest);

			$indIEDest = (int) ($destinatario['indIEDest'] ?? 9);
			$destObj = (object) [
				'xNome'     => (string) ($destinatario['razaosocial'] ?? 'CONSUMIDOR NAO IDENTIFICADO'),
				'indIEDest' => $indIEDest,
			];
			if ($tpAmb === 2) {
				// Homologação: CNPJ/nome padrão SEFAZ; IE real não pode ir com CNPJ fictício.
				$destObj->CNPJ      = self::CNPJ_DESTINATARIO_HOMOLOGACAO;
				$destObj->xNome     = 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';
				$destObj->indIEDest = 9;
				$indIEDest          = 9;
			} elseif ($documentoIdentificado && $isCnpj) {
				$destObj->CNPJ = $documentoDest;
			} elseif ($documentoIdentificado && $isCpf) {
				$destObj->CPF = $documentoDest;
			} else {
				// NF-e (55): destinatário segue obrigatório; mantém CNPJ de homologação
				// apenas como fallback legado quando o payload vier sem documento.
				$destObj->CNPJ = self::CNPJ_DESTINATARIO_HOMOLOGACAO;
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
		}

		$entregaFonte = null;
		if (is_array($localEntrega) && !empty($localEntrega['uf'])) {
			$entregaFonte = $localEntrega;
		} elseif (is_array($enderecoEntrega) && !empty($enderecoEntrega['uf'])) {
			$entregaFonte = $enderecoEntrega;
		}

		if (is_array($entregaFonte)) {
			$documentoEntrega = preg_replace(
				'/\D/',
				'',
				(string) ($entregaFonte['cnpjcpf'] ?? '')
			);
			$entrega = [
				'xNome'   => (string) ($entregaFonte['nome'] ?? ''),
				'xLgr'    => (string) ($entregaFonte['logradouro'] ?? ''),
				'nro'     => (string) ($entregaFonte['numero'] ?? ''),
				'xCpl'    => (string) ($entregaFonte['complemento'] ?? ''),
				'xBairro' => (string) ($entregaFonte['bairro'] ?? ''),
				'cMun'    => (string) ($entregaFonte['codigoMunicipio'] ?? ''),
				'xMun'    => (string) ($entregaFonte['municipio'] ?? ''),
				'UF'      => (string) $entregaFonte['uf'],
				'CEP'     => preg_replace('/\D/', '', (string) ($entregaFonte['cep'] ?? '')),
				'cPais'   => '1058',
				'xPais'   => 'BRASIL',
				'fone'    => preg_replace('/\D/', '', (string) ($entregaFonte['telefone'] ?? '')),
				'email'   => (string) ($entregaFonte['email'] ?? ''),
				'IE'      => preg_replace('/\D/', '', (string) ($entregaFonte['ie'] ?? '')),
			];
			if (strlen((string) $documentoEntrega) === 14) {
				$entrega['CNPJ'] = $documentoEntrega;
			} elseif (strlen((string) $documentoEntrega) === 11) {
				$entrega['CPF'] = $documentoEntrega;
			}
			$mk->tagentrega((object) array_filter(
				$entrega,
				static fn ($valor) => $valor !== '' && $valor !== null
			));
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
		$vTotTribTotal = 0;

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
			$vProdLiquido = round(max(0, $vProd - $vDescItem), 2);
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
			$cestDigitos = preg_replace('/\D/', '', (string) ($item['cest'] ?? ''));
			if (is_string($cestDigitos) && strlen($cestDigitos) === 7) {
				$prod->CEST = $cestDigitos;
			}
			$mk->tagprod(self::anexarValoresComerciaisProd(
				$prod,
				$vFreteItem,
				$vSegItem,
				$vDescItem,
				$vOutroItem,
			));

			$dataEmissao = substr($dhEmi, 0, 10);
			$rastrosItem = is_array($item['rastros'] ?? null) ? $item['rastros'] : [];
			foreach (MontarRastroItemNfe::montar($nItem, $rastrosItem, $dataEmissao) as $rastro) {
				$mk->tagRastro($rastro);
			}

			$mk->tagimposto((object) array_filter([
				'item'     => $nItem,
				'vTotTrib' => ($vTotTribItem = round((float) ($item['valorTributosAproximados'] ?? 0), 2)) > 0
					? $vTotTribItem
					: null,
			], static fn ($valor) => $valor !== null));
			$vTotTribTotal += $vTotTribItem;

			$csosn = trim((string) ($item['csosn'] ?? ''));
			$cst   = trim((string) ($item['cst'] ?? ''));
			$orig  = (int) ($item['orig'] ?? 0);

			if (in_array($crt, [1, 2, 4], true)) {
				if ($csosn === '' && $cst !== '' && preg_match('/^[1259]\d{2}$/', $cst)) {
					$csosn = $cst;
				}

				$mk->tagICMSSN(self::montarTagIcmsSn($nItem, $orig, $csosn, $item, $vProd));
			} else {
				$cstDigitos = preg_replace('/\D/', '', $cst);
				$cstIcms = ($cstDigitos !== null && $cstDigitos !== '')
					? substr(str_pad($cstDigitos, 2, '0', STR_PAD_LEFT), -2)
					: '00';
				// Grupo ICMS40 (leiaute 4.00): CST 40/41/50 sem vBC/pICMS/vICMS.
				if (in_array($cstIcms, ['40', '41', '50'], true)) {
					$tagIcms40 = [
						'item' => $nItem,
						'orig' => $orig,
						'CST'  => $cstIcms,
					];
					$vIcmsDesonItem = round((float) ($item['valorIcmsDesonerado'] ?? 0), 2);
					if ($vIcmsDesonItem > 0) {
						$tagIcms40['vICMSDeson'] = $vIcmsDesonItem;
						if (isset($item['motDesICMS']) && $item['motDesICMS'] !== '' && $item['motDesICMS'] !== null) {
							$tagIcms40['motDesICMS'] = (int) $item['motDesICMS'];
						}
					}
					$mk->tagICMS((object) $tagIcms40);
				} elseif ($cstIcms === '60') {
					// Grupo ICMS60: ICMS cobrado anteriormente por ST — sem vBC próprio.
					// Acumular vBC aqui gera rejeição 531 (ICMSTot/vBC ≠ Σ vBC dos itens).
					$tagIcms60 = [
						'item' => $nItem,
						'orig' => $orig,
						'CST'  => '60',
					];
					foreach ([
						'vBCSTRet' => ['vBCSTRet', 'baseIcmsStRet'],
						'pST' => ['pST', 'percentualSt'],
						'vICMSSubstituto' => ['vICMSSubstituto', 'valorIcmsSubstituto'],
						'vICMSSTRet' => ['vICMSSTRet', 'valorIcmsStRet'],
						'vBCFCPSTRet' => ['vBCFCPSTRet', 'baseFcpStRet'],
						'pFCPSTRet' => ['pFCPSTRet', 'aliquotaFcpStRet'],
						'vFCPSTRet' => ['vFCPSTRet', 'valorFcpStRet'],
					] as $campoXml => $aliases) {
						$valor = self::resolverNumeroItem($item, $aliases);
						if ($valor !== null && $valor > 0) {
							$tagIcms60[$campoXml] = round($valor, 2);
						}
					}
					$mk->tagICMS((object) $tagIcms60);
				} else {
					$vBC = self::resolverBaseIcmsItem($item, $vProdLiquido);
					$pICMS = (float) ($item['aliquotaIcms'] ?? 0);
					$vICMS = array_key_exists('valorIcms', $item)
						&& $item['valorIcms'] !== null
						&& $item['valorIcms'] !== ''
						? round((float) $item['valorIcms'], 2)
						: round($vBC * $pICMS / 100, 2);
					if ($pICMS <= 0 && $vBC > 0 && $vICMS > 0) {
						$pICMS = round($vICMS / $vBC * 100, 4);
					}
					// Arredonda por item antes de acumular (evita rejeição 531: BC total ≠ Σ itens).
					$vBcTotal = round($vBcTotal + $vBC, 2);
					$vIcmsTotal = round($vIcmsTotal + $vICMS, 2);
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

			$pis = MontarPisCofinsItemNfe::montarPis($nItem, $item, $vProdLiquido, $qCom);
			$cofins = MontarPisCofinsItemNfe::montarCofins($nItem, $item, $vProdLiquido, $qCom);
			$vPisTotal += round((float) ($pis->vPIS ?? 0), 2);
			$vCofinsTotal += round((float) ($cofins->vCOFINS ?? 0), 2);

			$mk->tagPIS($pis);
			$mk->tagCOFINS($cofins);
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
			'vTotTrib'   => round($vTotTribTotal, 2),
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
		// YA04 (card) obrigatório para cartão e meios eletrônicos (NT 2015.002 / 2023.004 / 2024.003)
		$tPagsComCard = ['03', '04', '15', '17'];
		foreach ($formasPag as $pag) {
			$tPagRaw = preg_replace('/\D/', '', (string) ($pag['tPag'] ?? '01'));
			$tPag = str_pad(substr((string) $tPagRaw, -2), 2, '0', STR_PAD_LEFT);
			$detPag = ['tPag' => $tPag];

			if ($tPag === '90') {
				$detPag['vPag'] = 0.0;
			} else {
				$detPag['indPag'] = (int) ($pag['indPag'] ?? 0);
				$detPag['vPag'] = (float) ($pag['vPag'] ?? $vNF);
			}

			if (in_array($tPag, $tPagsComCard, true)) {
				$cardRaw = $pag['card'] ?? null;
				if (is_object($cardRaw)) {
					$cardRaw = (array) $cardRaw;
				}
				$card = is_array($cardRaw) ? $cardRaw : [];
				$tpIntegra = (int) ($card['tpIntegra'] ?? 2);
				if ($tpIntegra !== 1) {
					$tpIntegra = 2;
				}
				// NFePHP só cria <card> se !empty(tpIntegra); string evita edge cases
				$detPag['tpIntegra'] = (string) $tpIntegra;

				if ($tpIntegra === 1) {
					if (!empty($card['CNPJ'])) {
						$detPag['CNPJ'] = preg_replace('/\D/', '', (string) $card['CNPJ']);
					}
					if (!empty($card['tBand'])) {
						$detPag['tBand'] = (string) $card['tBand'];
					}
					if (!empty($card['cAut'])) {
						$detPag['cAut'] = (string) $card['cAut'];
					}
				}
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

		$xml = MontarIbsCbsItemNfe::injetarNoXml($xml, $emitente, $itens, $configJson);

		$tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
		$tools->model($mod);
		$xmlAssinado = $tools->signNFe($xml);

		return [
			'xmlAssinado' => $xmlAssinado,
			'mod' => $mod,
		];
	}

	/**
	 * Gera PDF do DANFE a partir dos dados da NF-e, sem transmitir à SEFAZ.
	 *
	 * @param array<string, mixed> $configJson
	 * @param array<string, mixed> $payloadNfe
	 * @return array{pdfBase64: string, modelo: int}
	 */
	public static function previewDanfe(
		array $configJson,
		string $pfxBase64,
		string $senha,
		array $payloadNfe
	): array {
		$montagem = self::montarXmlAssinado($configJson, $pfxBase64, $senha, $payloadNfe);
		$danfe = DanfeService::gerar($montagem['xmlAssinado']);

		return [
			'pdfBase64' => $danfe['pdfBase64'],
			'modelo' => $danfe['modelo'] ?? $montagem['mod'],
		];
	}

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
		$montagem = self::montarXmlAssinado($configJson, $pfxBase64, $senha, $payloadNfe);
		$xmlAssinado = $montagem['xmlAssinado'];
		$mod = $montagem['mod'];

		$tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
		$tools->model($mod);


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
	 * Assina e transmite uma NFC-e de contingência já montada, sem remontar infNFe.
	 *
	 * @param array<string, mixed> $configJson
	 * @return array<string, string>
	 */
	public static function validarXmlContingenciaPreMontado(
		array $configJson,
		string $xml,
		string $chaveInformada
	): array {
		return self::validarXmlContingencia($configJson, $xml, $chaveInformada);
	}

	/**
	 * Assina e transmite uma NFC-e de contingência já montada, sem remontar infNFe.
	 *
	 * @param array<string, mixed> $configJson
	 * @return array<string, string>
	 */
	public static function transmitirXmlContingencia(
		array $configJson,
		string $pfxBase64,
		string $senha,
		string $xml,
		string $chaveInformada
	): array {
		$validacao = self::validarXmlContingencia(
			$configJson,
			$xml,
			$chaveInformada,
		);

		$tools = SpedNfeFactory::criarTools($configJson, $pfxBase64, $senha);
		$tools->model(65);
		$xmlAssinado = $tools->signNFe($xml);

		$validacaoAssinada = self::validarXmlContingencia(
			$configJson,
			$xmlAssinado,
			$validacao['chave'],
		);
		if (!hash_equals($validacao['hashInfNFe'], $validacaoAssinada['hashInfNFe'])) {
			throw new \RuntimeException('A assinatura modificou o conteúdo imutável de infNFe');
		}

		$idLote = str_pad((string) random_int(1, 99999999), 15, '0', STR_PAD_LEFT);
		$retorno = $tools->sefazEnviaLote([$xmlAssinado], $idLote, 1);
		$std = (new Standardize($retorno))->toStd();
		$cStatLote = (string) ($std->cStat ?? '');
		$xMotivoLote = (string) ($std->xMotivo ?? '');
		$cStat = $cStatLote;
		$xMotivo = $xMotivoLote;
		$protocolo = '';
		$chave = $validacao['chave'];
		$xmlAutorizado = '';

		$infProt = self::extrairInfProt($std);
		if ($infProt !== null) {
			$cStat = (string) ($infProt->cStat ?? $cStatLote);
			$xMotivo = (string) ($infProt->xMotivo ?? $xMotivoLote);
			$protocolo = (string) ($infProt->nProt ?? '');
			$chaveRetornada = preg_replace('/\D/', '', (string) ($infProt->chNFe ?? '')) ?? '';
			if ($chaveRetornada !== '' && $chaveRetornada !== $chave) {
				throw new \RuntimeException('SEFAZ retornou protocolo para chave divergente');
			}
		}

		if ($cStat === '100') {
			$xmlAutorizado = Complements::toAuthorize($xmlAssinado, $retorno);
		}

		return [
			'xmlAssinado' => $xmlAssinado,
			'xmlAutorizado' => $xmlAutorizado,
			'xmlRetorno' => $retorno,
			'chave' => $chave,
			'cStat' => $cStat,
			'cStatLote' => $cStatLote,
			'xMotivo' => $xMotivo,
			'protocolo' => $protocolo,
		];
	}

	/**
	 * @param array<string, mixed> $configJson
	 * @return array{chave: string, hashInfNFe: string}
	 */
	private static function validarXmlContingencia(
		array $configJson,
		string $xml,
		string $chaveInformada
	): array {
		if (trim($xml) === '') {
			throw new \InvalidArgumentException('XML de contingência obrigatório');
		}

		$anterior = libxml_use_internal_errors(true);
		$dom = new \DOMDocument();
		$carregado = $dom->loadXML($xml, LIBXML_NONET | LIBXML_NOBLANKS);
		libxml_clear_errors();
		libxml_use_internal_errors($anterior);
		if (!$carregado) {
			throw new \InvalidArgumentException('XML de contingência inválido');
		}

		$xpath = new \DOMXPath($dom);
		$xpath->registerNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');
		$infNFe = $xpath->query('//nfe:NFe/nfe:infNFe')->item(0);
		if (!$infNFe instanceof \DOMElement) {
			throw new \InvalidArgumentException('XML sem infNFe no leiaute oficial');
		}

		$id = $infNFe->getAttribute('Id');
		if (!preg_match('/^NFe(\d{44})$/', $id, $match)) {
			throw new \InvalidArgumentException('Id de infNFe inválido');
		}
		$chave = $match[1];
		$chavePayload = preg_replace('/\D/', '', $chaveInformada) ?? '';
		if ($chavePayload !== '' && $chavePayload !== $chave) {
			throw new \InvalidArgumentException('Chave informada diverge de infNFe/@Id');
		}
		if (substr($chave, 20, 2) !== '65') {
			throw new \InvalidArgumentException('Chave informada não pertence ao modelo 65');
		}

		$valor = static function (\DOMXPath $xpath, string $expressao): string {
			return trim((string) $xpath->evaluate("string($expressao)"));
		};
		if ($valor($xpath, '//nfe:infNFe/nfe:ide/nfe:mod') !== '65') {
			throw new \InvalidArgumentException('XML informado não é NFC-e modelo 65');
		}
		if ($valor($xpath, '//nfe:infNFe/nfe:ide/nfe:tpEmis') !== '9') {
			throw new \InvalidArgumentException('XML deve preservar tpEmis=9');
		}

		$ambienteXml = $valor($xpath, '//nfe:infNFe/nfe:ide/nfe:tpAmb');
		$ambienteConfig = (string) ($configJson['tpAmb'] ?? '');
		if (!in_array($ambienteXml, ['1', '2'], true) || $ambienteXml !== $ambienteConfig) {
			throw new \InvalidArgumentException('Ambiente do XML diverge da configuração');
		}

		$cnpjXml = preg_replace(
			'/\D/',
			'',
			$valor($xpath, '//nfe:infNFe/nfe:emit/nfe:CNPJ'),
		) ?? '';
		$cnpjConfig = preg_replace('/\D/', '', (string) ($configJson['cnpj'] ?? '')) ?? '';
		if (strlen($cnpjXml) !== 14 || $cnpjXml !== $cnpjConfig) {
			throw new \InvalidArgumentException('Emitente do XML diverge da configuração');
		}

		foreach ([
			'//nfe:infNFe/nfe:ide/nfe:dhEmi',
			'//nfe:infNFe/nfe:ide/nfe:dhCont',
			'//nfe:infNFe/nfe:emit/nfe:enderEmit',
			'//nfe:infNFe/nfe:det',
			'//nfe:infNFe/nfe:total/nfe:ICMSTot',
			'//nfe:infNFe/nfe:transp',
			'//nfe:infNFe/nfe:pag/nfe:detPag',
		] as $obrigatorio) {
			if ($xpath->query($obrigatorio)->length === 0) {
				throw new \InvalidArgumentException(
					'XML legado/incompleto requer revisão manual; campo ausente: ' . $obrigatorio,
				);
			}
		}

		$canonico = $infNFe->C14N(true, false);
		if (!is_string($canonico)) {
			throw new \RuntimeException('Não foi possível canonizar infNFe');
		}

		return [
			'chave' => $chave,
			'hashInfNFe' => hash('sha256', $canonico),
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
			'outrasDespesas' => 0.0,
		];
		$descontos = self::distribuirDescontoCombinado($itens, (float) ($totaisComerciais['desconto'] ?? 0));

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
				'vDesc' => $descontos[$indice] ?? 0.0,
				'vOutro' => $valoresItem['outrasDespesas'],
			]);
		}

		return $resultado;
	}

	/**
	 * Soma o desconto explícito do item com a parcela do desconto global.
	 * O global é rateado pela capacidade restante e o último item elegível
	 * recebe o centavo de fechamento. Nenhuma linha ultrapassa o bruto.
	 *
	 * @param array<int, array<string, mixed>> $itens
	 * @return list<float>
	 */
	private static function distribuirDescontoCombinado(array $itens, float $descontoGlobal): array
	{
		$bases = [];
		$capacidadeTotal = 0.0;
		foreach ($itens as $item) {
			$bruto = round(
				(float) ($item['quantidade'] ?? 1) * (float) ($item['valorUnitario'] ?? 0),
				2
			);
			$explicito = round(max(0, (float) ($item['desconto'] ?? 0)), 2);
			if ($explicito > $bruto) {
				$explicito = $bruto;
			}
			$capacidade = round($bruto - $explicito, 2);
			$bases[] = [
				'bruto' => $bruto,
				'explicito' => $explicito,
				'capacidade' => $capacidade,
			];
			$capacidadeTotal = round($capacidadeTotal + $capacidade, 2);
		}

		$global = round(max(0, $descontoGlobal), 2);
		if ($global > $capacidadeTotal) {
			$global = $capacidadeTotal;
		}

		$ultimoElegivel = -1;
		foreach ($bases as $indice => $base) {
			if ($base['capacidade'] > 0) {
				$ultimoElegivel = $indice;
			}
		}

		$rateios = array_fill(0, count($bases), 0.0);
		if ($global > 0 && $capacidadeTotal > 0 && $ultimoElegivel >= 0) {
			$acumulado = 0.0;
			foreach ($bases as $indice => $base) {
				if ($base['capacidade'] <= 0) {
					continue;
				}
				if ($indice === $ultimoElegivel) {
					$rateios[$indice] = round($global - $acumulado, 2);
				} else {
					$valor = round($global * $base['capacidade'] / $capacidadeTotal, 2);
					$rateios[$indice] = min($valor, $base['capacidade']);
					$acumulado = round($acumulado + $rateios[$indice], 2);
				}
			}
			if ($rateios[$ultimoElegivel] > $bases[$ultimoElegivel]['capacidade']) {
				$rateios[$ultimoElegivel] = $bases[$ultimoElegivel]['capacidade'];
			}
			if ($rateios[$ultimoElegivel] < 0) {
				$rateios[$ultimoElegivel] = 0.0;
			}
		}

		$efetivos = [];
		foreach ($bases as $indice => $base) {
			$efetivo = round($base['explicito'] + $rateios[$indice], 2);
			$efetivos[] = min($efetivo, $base['bruto']);
		}

		return $efetivos;
	}

	/**
	 * Garante legenda legal do Simples Nacional nas informações complementares.
	 *
	 * @param list<array<string, mixed>> $itens
	 */
	private static function resolverInformacoesAdicionaisSimples(
		int $crt,
		string $infoAdic,
		array $itens
	): string {
		if (!in_array($crt, [1, 2, 4], true)) {
			return $infoAdic;
		}

		$texto = trim($infoAdic);
		$jaTemSimples = stripos($texto, 'SIMPLES NACIONAL') !== false;

		$temCreditoSn = false;
		foreach ($itens as $item) {
			$csosn = trim((string) ($item['csosn'] ?? ''));
			if ($csosn === '' && preg_match('/^[1259]\d{2}$/', trim((string) ($item['cst'] ?? '')))) {
				$csosn = trim((string) $item['cst']);
			}
			if (in_array($csosn, ['101', '201'], true)) {
				$temCreditoSn = true;
				break;
			}
		}

		$legenda = $temCreditoSn
			? 'DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL'
			: 'DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE ICMS';

		if ($jaTemSimples) {
			return $texto;
		}

		return $texto === '' ? $legenda : rtrim($texto, " .;") . '. ' . $legenda;
	}

	/**
	 * Resolve vBC do ICMS por item (2 casas).
	 * Evita rejeição 531 quando baseIcms chega zerada/vazia e ao somar floats sem arredondar.
	 *
	 * @param array<string, mixed> $item
	 */
	public static function resolverBaseIcmsItem(array $item, float $vProdLiquido): float {
		$temBase = array_key_exists('baseIcms', $item)
			&& $item['baseIcms'] !== null
			&& $item['baseIcms'] !== '';
		if (!$temBase) {
			return round($vProdLiquido, 2);
		}
		$baseInformada = round((float) $item['baseIcms'], 2);
		if ($baseInformada <= 0) {
			return round($vProdLiquido, 2);
		}
		return $baseInformada;
	}

	/**
	 * Monta os campos do ICMSSN conforme o CSOSN informado.
	 *
	 * @param array<string, mixed> $item
	 */
	private static function montarTagIcmsSn(
		int $nItem,
		int $orig,
		string $csosn,
		array $item,
		float $vProd
	): object {
		$dados = [
			'item'  => $nItem,
			'orig'  => $orig,
			'CSOSN' => $csosn,
		];

		// Não usar aliquotaIcms aqui: no Simples ela não representa crédito SN.
		$pCredSN = self::resolverNumeroItem($item, ['pCredSN', 'aliquotaCreditoSn']);
		$vCredICMSSN = self::resolverNumeroItem($item, ['vCredICMSSN', 'valorCreditoIcmsSn']);

		if (in_array($csosn, ['101', '201'], true)) {
			if ($pCredSN === null && $vCredICMSSN !== null && $vProd > 0) {
				$pCredSN = round($vCredICMSSN / $vProd * 100, 4);
			}
			if ($pCredSN !== null && ($vCredICMSSN === null || $vCredICMSSN <= 0) && $vProd > 0) {
				$vCredICMSSN = round($vProd * $pCredSN / 100, 2);
			}
			if ($pCredSN !== null) {
				$dados['pCredSN'] = round($pCredSN, 4);
			}
			if ($vCredICMSSN !== null) {
				$dados['vCredICMSSN'] = round($vCredICMSSN, 2);
			}
		}

		if ($csosn === '500') {
			$vBCSTRet = self::resolverNumeroItem($item, ['vBCSTRet', 'baseIcmsStRet']);
			$vICMSSTRet = self::resolverNumeroItem($item, ['vICMSSTRet', 'valorIcmsStRet']);
			if ($vBCSTRet !== null) {
				$dados['vBCSTRet'] = round($vBCSTRet, 2);
			}
			if ($vICMSSTRet !== null) {
				$dados['vICMSSTRet'] = round($vICMSSTRet, 2);
			}
		}

		if (in_array($csosn, ['201', '202', '203'], true)) {
			foreach ([
				'modBCST' => ['modBCST'],
				'pMVAST' => ['pMVAST', 'percentualMvaSt'],
				'pRedBCST' => ['pRedBCST', 'percentualReducaoBcSt'],
				'vBCST' => ['vBCST', 'baseIcmsSt'],
				'pICMSST' => ['pICMSST', 'aliquotaIcmsSt'],
				'vICMSST' => ['vICMSST', 'valorIcmsSt'],
				'vBCFCPST' => ['vBCFCPST', 'baseFcpSt'],
				'pFCPST' => ['pFCPST', 'aliquotaFcpSt'],
				'vFCPST' => ['vFCPST', 'valorFcpSt'],
			] as $campoXml => $aliases) {
				$valor = self::resolverNumeroItem($item, $aliases);
				if ($valor !== null) {
					$dados[$campoXml] = round($valor, $campoXml === 'modBCST' ? 0 : 2);
				}
			}
			if (isset($dados['pMVAST']) && !isset($dados['modBCST'])) {
				$dados['modBCST'] = 4;
			}
		}

		return (object) $dados;
	}

	/**
	 * @param array<string, mixed> $item
	 * @param list<string> $chaves
	 */
	private static function resolverNumeroItem(array $item, array $chaves): ?float
	{
		foreach ($chaves as $chave) {
			if (!array_key_exists($chave, $item) || $item[$chave] === null || $item[$chave] === '') {
				continue;
			}
			return (float) $item[$chave];
		}

		return null;
	}
}
