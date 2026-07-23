<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Services;

use NFePHP\DA\NFe\Danfce;
use NFePHP\DA\NFe\Danfe;

final class DanfeService
{
	/** CSOSN em que ICMS próprio (vBC/pICMS/vICMS) não deve aparecer no DANFE. */
	private const CSOSN_SEM_ICMS_PROPRIO = [
		'101', '102', '103', '201', '202', '203', '300', '400', '500',
	];

	public static function gerar(string $xml): array
	{
		$xml = trim($xml);
		if ($xml === '') {
			throw new \InvalidArgumentException('XML da NF-e é obrigatório');
		}

		$modelo = self::detectarModelo($xml);
		$crt = self::detectarCrt($xml);
		$xmlRender = self::prepararXmlParaDanfe($xml, $crt);

		if ($modelo === 65) {
			$danfce = new Danfce($xmlRender);
			$danfce->debugMode(false);
			$pdf = $danfce->render();
		} else {
			$danfe = new Danfe($xmlRender);
			$danfe->debugMode(false);
			$danfe->exibirTextoFatura = false;
			$danfe->creditsIntegratorFooter('Mais Gestão ERP');

			if (self::ehSimplesNacional($crt)) {
				// Simples: não destacar PIS/COFINS nem DIFAL no quadro de impostos do DANFE.
				$danfe->exibirPIS = false;
				$danfe->exibirIcmsInterestadual = false;
				$danfe->setGerarInformacoesAutomaticas(true);
			}

			$pdf = $danfe->render();
		}

		return [
			'pdfBase64' => base64_encode($pdf),
			'modelo' => $modelo,
		];
	}

	private static function detectarModelo(string $xml): int
	{
		if (preg_match('/<mod>(\d+)<\/mod>/', $xml, $matches)) {
			return (int) $matches[1];
		}

		return 55;
	}

	private static function detectarCrt(string $xml): int
	{
		if (preg_match('/<CRT>(\d+)<\/CRT>/', $xml, $matches)) {
			return (int) $matches[1];
		}

		return 3;
	}

	private static function ehSimplesNacional(int $crt): bool
	{
		return in_array($crt, [1, 2, 4], true);
	}

	/**
	 * Ajustes de layout para Simples Nacional sem alterar o XML autorizado persistido:
	 * - zera ICMSTot.vBC / vICMS (ICMS próprio não é destacado);
	 * - remove vBC/pICMS/vICMS indevidos do grupo ICMSSN;
	 * - CRT 2 passa a exibir coluna O/CSOSN no DANFE (biblioteca só trata 1 e 4).
	 */
	private static function prepararXmlParaDanfe(string $xml, int $crt): string
	{
		if (!self::ehSimplesNacional($crt)) {
			return $xml;
		}

		$dom = new \DOMDocument();
		$dom->preserveWhiteSpace = false;
		$dom->formatOutput = false;
		if (@$dom->loadXML($xml) === false) {
			return $xml;
		}

		// CRT 2 (excesso sublimite) também usa CSOSN; a lib só rotula CSOSN para CRT 1/4.
		if ($crt === 2) {
			foreach ($dom->getElementsByTagName('CRT') as $node) {
				$node->nodeValue = '1';
			}
		}

		foreach ($dom->getElementsByTagName('ICMSTot') as $icmsTot) {
			self::definirTagFilha($dom, $icmsTot, 'vBC', '0.00');
			self::definirTagFilha($dom, $icmsTot, 'vICMS', '0.00');
		}

		// Grupos reais no XML: ICMSSN101, ICMSSN102, ICMSSN201, etc.
		$xpath = new \DOMXPath($dom);
		$gruposSn = $xpath->query('//*[starts-with(local-name(), "ICMSSN")]');
		if ($gruposSn !== false) {
			foreach ($gruposSn as $grupo) {
				if (!$grupo instanceof \DOMElement) {
					continue;
				}
				$csosn = '';
				foreach ($grupo->childNodes as $filho) {
					if ($filho->nodeType === XML_ELEMENT_NODE && $filho->nodeName === 'CSOSN') {
						$csosn = trim((string) $filho->nodeValue);
						break;
					}
				}
				if ($csosn === '' && preg_match('/^ICMSSN(\d{3})$/', $grupo->nodeName, $m)) {
					$csosn = $m[1];
				}
				self::removerIcmsProprioDoGrupo($grupo, $csosn);
			}
		}

		$xmlAjustado = $dom->saveXML();
		return is_string($xmlAjustado) && $xmlAjustado !== '' ? $xmlAjustado : $xml;
	}

	private static function removerIcmsProprioDoGrupo(\DOMNode $grupo, string $csosn): void
	{
		if (!in_array($csosn, self::CSOSN_SEM_ICMS_PROPRIO, true)) {
			return;
		}

		$remover = [];
		foreach ($grupo->childNodes as $filho) {
			if ($filho->nodeType !== XML_ELEMENT_NODE) {
				continue;
			}
			if (in_array($filho->nodeName, ['vBC', 'pICMS', 'vICMS'], true)) {
				$remover[] = $filho;
			}
		}
		foreach ($remover as $node) {
			$grupo->removeChild($node);
		}
	}

	private static function definirTagFilha(
		\DOMDocument $dom,
		\DOMElement $pai,
		string $nome,
		string $valor
	): void {
		$existente = null;
		foreach ($pai->childNodes as $filho) {
			if ($filho->nodeType === XML_ELEMENT_NODE && $filho->nodeName === $nome) {
				$existente = $filho;
				break;
			}
		}

		if ($existente instanceof \DOMElement) {
			$existente->nodeValue = $valor;
			return;
		}

		$novo = $dom->createElement($nome, $valor);
		$pai->appendChild($novo);
	}
}
