<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Fiscal;

/**
 * Monta e injeta o grupo IBSCBS (NT 2025.002 / LC 214) no XML da NF-e/NFC-e.
 *
 * O sped-nfe local ainda não expõe tagIBSCBS; a injeção ocorre após Make::getXML().
 * Simples Nacional (CRT 1/2/4): não injeta (piloto não se aplica).
 * Schema PL_009_V4 (e anteriores): não injeta — o XSD rejeita IBSCBS/IBSCBSTot.
 * Somente PL_010b+ (NT 2025.002) aceita esses grupos na ordem correta.
 */
final class MontarIbsCbsItemNfe
{
	/** CSTs que exigem gIBSCBS com vBC/alíquotas (flags do catálogo oficial). */
	private const CST_COM_GIBSCBS = ['000', '200', '220', '222', '510', '515', '550', '830'];

	/**
	 * @param array<string, mixed> $emitente
	 * @param list<array<string, mixed>> $itens
	 * @param array<string, mixed> $configJson config sped-nfe (schemes/schema)
	 */
	public static function injetarNoXml(
		string $xml,
		array $emitente,
		array $itens,
		array $configJson = [],
	): string {
		$crt = (int) ($emitente['crt'] ?? 3);
		if (in_array($crt, [1, 2, 4], true)) {
			return $xml;
		}

		if (!self::schemaSuportaIbsCbs($configJson)) {
			return $xml;
		}

		$dom = new \DOMDocument('1.0', 'UTF-8');
		$dom->preserveWhiteSpace = false;
		$dom->formatOutput = false;
		if (!$dom->loadXML($xml)) {
			throw new \RuntimeException('XML inválido ao injetar IBSCBS');
		}

		$xpath = new \DOMXPath($dom);
		$xpath->registerNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');

		$totais = [
			'vBCIBSCBS' => 0.0,
			'vIBSUF' => 0.0,
			'vIBSMun' => 0.0,
			'vIBS' => 0.0,
			'vCBS' => 0.0,
		];
		$algumInjetado = false;

		$dets = $xpath->query('//nfe:infNFe/nfe:det');
		if ($dets === false) {
			return $xml;
		}

		foreach ($dets as $indice => $det) {
			/** @var \DOMElement $det */
			$item = $itens[$indice] ?? null;
			if (!is_array($item)) {
				continue;
			}

			$ibs = $item['ibsCbs'] ?? null;
			if (!is_array($ibs)) {
				continue;
			}

			$cst = self::normalizarCst($ibs['cst'] ?? null);
			$cClassTrib = self::normalizarClassTrib($ibs['cClassTrib'] ?? null);
			if ($cst === null || $cClassTrib === null) {
				continue;
			}

			$impostoNodes = $xpath->query('./nfe:imposto', $det);
			if ($impostoNodes === false || $impostoNodes->length === 0) {
				continue;
			}
			/** @var \DOMElement $imposto */
			$imposto = $impostoNodes->item(0);

			// Evita duplicar se já existir
			$existente = $xpath->query('./nfe:IBSCBS', $imposto);
			if ($existente !== false && $existente->length > 0) {
				continue;
			}

			$vProd = self::resolverBaseCalculo($item, $xpath, $det);
			$pIbs = self::paraFloat($ibs['aliquotaIbs'] ?? $ibs['aliquotaibs'] ?? 0);
			$pCbs = self::paraFloat($ibs['aliquotaCbs'] ?? $ibs['aliquotacbs'] ?? 0);
			// Sem alíquota municipal dedicada no cadastro: IBS inteiro na UF.
			$pIbsUf = $pIbs;
			$pIbsMun = 0.0;

			$vIbsUf = round($vProd * $pIbsUf / 100, 2);
			$vIbsMun = round($vProd * $pIbsMun / 100, 2);
			$vIbs = round($vIbsUf + $vIbsMun, 2);
			$vCbs = round($vProd * $pCbs / 100, 2);

			$ns = $imposto->namespaceURI ?: 'http://www.portalfiscal.inf.br/nfe';
			$ibsCbs = $dom->createElementNS($ns, 'IBSCBS');
			$ibsCbs->appendChild($dom->createElementNS($ns, 'CST', $cst));
			$ibsCbs->appendChild($dom->createElementNS($ns, 'cClassTrib', $cClassTrib));

			if (in_array($cst, self::CST_COM_GIBSCBS, true)) {
				$g = $dom->createElementNS($ns, 'gIBSCBS');
				$g->appendChild($dom->createElementNS($ns, 'vBC', self::fmt2($vProd)));

				$gUf = $dom->createElementNS($ns, 'gIBSUF');
				$gUf->appendChild($dom->createElementNS($ns, 'pIBSUF', self::fmt4($pIbsUf)));
				$gUf->appendChild($dom->createElementNS($ns, 'vIBSUF', self::fmt2($vIbsUf)));
				$g->appendChild($gUf);

				$gMun = $dom->createElementNS($ns, 'gIBSMun');
				$gMun->appendChild($dom->createElementNS($ns, 'pIBSMun', self::fmt4($pIbsMun)));
				$gMun->appendChild($dom->createElementNS($ns, 'vIBSMun', self::fmt2($vIbsMun)));
				$g->appendChild($gMun);

				$g->appendChild($dom->createElementNS($ns, 'vIBS', self::fmt2($vIbs)));

				$gCbs = $dom->createElementNS($ns, 'gCBS');
				$gCbs->appendChild($dom->createElementNS($ns, 'pCBS', self::fmt4($pCbs)));
				$gCbs->appendChild($dom->createElementNS($ns, 'vCBS', self::fmt2($vCbs)));
				$g->appendChild($gCbs);

				$ibsCbs->appendChild($g);

				$totais['vBCIBSCBS'] += $vProd;
				$totais['vIBSUF'] += $vIbsUf;
				$totais['vIBSMun'] += $vIbsMun;
				$totais['vIBS'] += $vIbs;
				$totais['vCBS'] += $vCbs;
			}

			// PL_010b: COFINS → COFINSST? → ICMSUFDest? → IS? → IBSCBS
			self::inserirAposUltimoGrupoImposto($imposto, $ibsCbs);
			$algumInjetado = true;
		}

		if ($algumInjetado) {
			self::injetarTotais($dom, $xpath, $totais);
		}

		$resultado = $dom->saveXML();
		if ($resultado === false) {
			throw new \RuntimeException('Falha ao serializar XML com IBSCBS');
		}

		return $resultado;
	}

	/**
	 * PL_010b+ (NT 2025.002). PL_009_V4 rejeita IBSCBS no XSD.
	 *
	 * @param array<string, mixed> $configJson
	 */
	public static function schemaSuportaIbsCbs(array $configJson): bool
	{
		$schema = (string) ($configJson['schemes'] ?? $configJson['schema'] ?? '');
		return (bool) preg_match('/PL_010/i', $schema);
	}

	/**
	 * Insere IBSCBS após COFINS/COFINSST/ICMSUFDest/IS (ordem PL_010b).
	 */
	private static function inserirAposUltimoGrupoImposto(
		\DOMElement $imposto,
		\DOMElement $ibsCbs,
	): void {
		$ordemAposCofins = ['COFINSST', 'ICMSUFDest', 'IS'];
		$ancoragem = null;
		foreach ($imposto->childNodes as $filho) {
			if (!$filho instanceof \DOMElement) {
				continue;
			}
			$local = $filho->localName ?: $filho->nodeName;
			if ($local === 'COFINS' || in_array($local, $ordemAposCofins, true)) {
				$ancoragem = $filho;
			}
		}

		if ($ancoragem !== null && $ancoragem->nextSibling !== null) {
			$imposto->insertBefore($ibsCbs, $ancoragem->nextSibling);
			return;
		}
		if ($ancoragem !== null) {
			$imposto->appendChild($ibsCbs);
			return;
		}

		$imposto->appendChild($ibsCbs);
	}

	/**
	 * @param array{vBCIBSCBS: float, vIBSUF: float, vIBSMun: float, vIBS: float, vCBS: float} $totais
	 */
	private static function injetarTotais(\DOMDocument $dom, \DOMXPath $xpath, array $totais): void
	{
		$totalNodes = $xpath->query('//nfe:infNFe/nfe:total');
		if ($totalNodes === false || $totalNodes->length === 0) {
			return;
		}
		/** @var \DOMElement $total */
		$total = $totalNodes->item(0);

		$existente = $xpath->query('./nfe:IBSCBSTot', $total);
		if ($existente !== false && $existente->length > 0) {
			return;
		}

		$ns = $total->namespaceURI ?: 'http://www.portalfiscal.inf.br/nfe';
		$ibsTot = $dom->createElementNS($ns, 'IBSCBSTot');
		$ibsTot->appendChild($dom->createElementNS($ns, 'vBCIBSCBS', self::fmt2($totais['vBCIBSCBS'])));
		$ibsTot->appendChild($dom->createElementNS($ns, 'vIBSUF', self::fmt2($totais['vIBSUF'])));
		$ibsTot->appendChild($dom->createElementNS($ns, 'vIBSMun', self::fmt2($totais['vIBSMun'])));
		$ibsTot->appendChild($dom->createElementNS($ns, 'vIBS', self::fmt2($totais['vIBS'])));
		$ibsTot->appendChild($dom->createElementNS($ns, 'vCBS', self::fmt2($totais['vCBS'])));

		// PL_010b: ICMSTot → ISSQNtot? → retTrib? → ISTot? → IBSCBSTot → vNFTot?
		$ancoragem = null;
		foreach ($total->childNodes as $filho) {
			if (!$filho instanceof \DOMElement) {
				continue;
			}
			$local = $filho->localName ?: $filho->nodeName;
			if (in_array($local, ['ICMSTot', 'ISSQNtot', 'retTrib', 'ISTot'], true)) {
				$ancoragem = $filho;
			}
		}
		if ($ancoragem !== null && $ancoragem->nextSibling !== null) {
			$total->insertBefore($ibsTot, $ancoragem->nextSibling);
			return;
		}
		if ($ancoragem !== null) {
			$total->appendChild($ibsTot);
			return;
		}
		$total->appendChild($ibsTot);
	}

	/**
	 * @param array<string, mixed> $item
	 */
	private static function resolverBaseCalculo(array $item, \DOMXPath $xpath, \DOMElement $det): float
	{
		if (isset($item['valorUnitario'], $item['quantidade'])) {
			$vProd = (float) $item['quantidade'] * (float) $item['valorUnitario'];
			$desconto = (float) ($item['desconto'] ?? 0);
			return round(max($vProd - $desconto, 0), 2);
		}

		$vProdNodes = $xpath->query('./nfe:prod/nfe:vProd', $det);
		if ($vProdNodes !== false && $vProdNodes->length > 0) {
			return round((float) $vProdNodes->item(0)->textContent, 2);
		}

		return 0.0;
	}

	public static function normalizarCst(mixed $valor): ?string
	{
		$digitos = preg_replace('/\D/', '', (string) ($valor ?? ''));
		if ($digitos === null || $digitos === '') {
			return null;
		}

		return str_pad(substr($digitos, -3), 3, '0', STR_PAD_LEFT);
	}

	public static function normalizarClassTrib(mixed $valor): ?string
	{
		$digitos = preg_replace('/\D/', '', (string) ($valor ?? ''));
		if ($digitos === null || $digitos === '') {
			return null;
		}

		return str_pad(substr($digitos, -6), 6, '0', STR_PAD_LEFT);
	}

	private static function paraFloat(mixed $valor): float
	{
		if (is_int($valor) || is_float($valor)) {
			return (float) $valor;
		}
		$texto = trim((string) $valor);
		if ($texto === '') {
			return 0.0;
		}
		if (str_contains($texto, ',')) {
			$texto = str_replace('.', '', $texto);
			$texto = str_replace(',', '.', $texto);
		}

		return (float) $texto;
	}

	private static function fmt2(float $valor): string
	{
		return number_format($valor, 2, '.', '');
	}

	private static function fmt4(float $valor): string
	{
		return number_format($valor, 4, '.', '');
	}
}
