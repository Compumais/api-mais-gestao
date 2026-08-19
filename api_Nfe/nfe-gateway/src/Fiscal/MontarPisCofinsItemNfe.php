<?php

declare(strict_types=1);

namespace MaisGestao\NfeGateway\Fiscal;

/**
 * Monta o stdClass de PIS/COFINS para o NFePHP tagPIS/tagCOFINS.
 *
 * O XSD exige exatamente um filho (PISAliq, PISQtde, PISNT ou PISOutr).
 * CST vazio, de 1 dígito ou não mapeado faz o NFePHP emitir <PIS></PIS>
 * e a SEFAZ rejeitar (pré-visualização e autorização).
 *
 * Fallback: CST 07 + grupo NT — já era o default do montador
 * (`cstPis ?? '07'`) e da NF-e de homologação.
 */
final class MontarPisCofinsItemNfe
{
	public const CST_FALLBACK_NT = '07';

	/** @var list<string> */
	private const CST_ALIQ = ['01', '02'];

	/** @var list<string> */
	private const CST_QTDE = ['03'];

	/** @var list<string> */
	private const CST_NT = ['04', '05', '06', '07', '08', '09'];

	/** @var list<string> */
	private const CST_OUTR = [
		'49', '50', '51', '52', '53', '54', '55', '56',
		'60', '61', '62', '63', '64', '65', '66', '67',
		'70', '71', '72', '73', '74', '75', '98', '99',
	];

	/**
	 * @param array<string, mixed> $item
	 */
	public static function montarPis(int $nItem, array $item, float $vProd, float $qCom): object
	{
		return self::montar(
			$nItem,
			$item['cstPis'] ?? $item['cstpis'] ?? null,
			$item['aliquotaPis'] ?? $item['aliquotapis'] ?? 0,
			$vProd,
			$qCom,
			'pPIS',
			'vPIS',
		);
	}

	/**
	 * @param array<string, mixed> $item
	 */
	public static function montarCofins(int $nItem, array $item, float $vProd, float $qCom): object
	{
		return self::montar(
			$nItem,
			$item['cstCofins'] ?? $item['cstcofins'] ?? null,
			$item['aliquotaCofins'] ?? $item['aliquotacofins'] ?? 0,
			$vProd,
			$qCom,
			'pCOFINS',
			'vCOFINS',
		);
	}

	public static function normalizarCst(mixed $valor): ?string
	{
		if ($valor === null || $valor === '') {
			return null;
		}

		if (is_int($valor) || is_float($valor)) {
			$numero = (float) $valor;
			if (is_nan($numero) || is_infinite($numero) || $numero < 0 || $numero > 99) {
				return null;
			}

			return str_pad((string) (int) floor($numero), 2, '0', STR_PAD_LEFT);
		}

		$texto = trim((string) $valor);
		if ($texto === '') {
			return null;
		}

		$comPonto = str_replace(',', '.', $texto);
		if (is_numeric($comPonto)) {
			$numero = (float) $comPonto;
			if ($numero < 0 || $numero > 99) {
				return null;
			}

			return str_pad((string) (int) floor($numero), 2, '0', STR_PAD_LEFT);
		}

		$digitos = preg_replace('/\D/', '', $texto) ?? '';
		if ($digitos === '') {
			return null;
		}
		if (strlen($digitos) === 1) {
			return str_pad($digitos, 2, '0', STR_PAD_LEFT);
		}

		return substr($digitos, -2);
	}

	public static function resolverGrupo(string $cst): ?string
	{
		if (in_array($cst, self::CST_ALIQ, true)) {
			return 'aliq';
		}
		if (in_array($cst, self::CST_QTDE, true)) {
			return 'qtde';
		}
		if (in_array($cst, self::CST_NT, true)) {
			return 'nt';
		}
		if (in_array($cst, self::CST_OUTR, true)) {
			return 'outr';
		}

		return null;
	}

	public static function serializarXmlPis(object $std): string
	{
		$cst = (string) ($std->CST ?? '');
		$grupo = self::resolverGrupo($cst) ?? 'nt';

		if ($grupo === 'aliq') {
			return sprintf(
				'<PIS><PISAliq><CST>%s</CST><vBC>%s</vBC><pPIS>%s</pPIS><vPIS>%s</vPIS></PISAliq></PIS>',
				$cst,
				self::fmt2($std->vBC ?? 0),
				(string) ($std->pPIS ?? 0),
				self::fmt2($std->vPIS ?? 0),
			);
		}
		if ($grupo === 'qtde') {
			return sprintf(
				'<PIS><PISQtde><CST>%s</CST><qBCProd>%s</qBCProd><vAliqProd>%s</vAliqProd><vPIS>%s</vPIS></PISQtde></PIS>',
				$cst,
				(string) ($std->qBCProd ?? 0),
				(string) ($std->vAliqProd ?? 0),
				self::fmt2($std->vPIS ?? 0),
			);
		}
		if ($grupo === 'outr') {
			return sprintf(
				'<PIS><PISOutr><CST>%s</CST><vBC>%s</vBC><pPIS>%s</pPIS><vPIS>%s</vPIS></PISOutr></PIS>',
				$cst,
				self::fmt2($std->vBC ?? 0),
				(string) ($std->pPIS ?? 0),
				self::fmt2($std->vPIS ?? 0),
			);
		}

		return sprintf('<PIS><PISNT><CST>%s</CST></PISNT></PIS>', $cst);
	}

	public static function serializarXmlCofins(object $std): string
	{
		$cst = (string) ($std->CST ?? '');
		$grupo = self::resolverGrupo($cst) ?? 'nt';

		if ($grupo === 'aliq') {
			return sprintf(
				'<COFINS><COFINSAliq><CST>%s</CST><vBC>%s</vBC><pCOFINS>%s</pCOFINS><vCOFINS>%s</vCOFINS></COFINSAliq></COFINS>',
				$cst,
				self::fmt2($std->vBC ?? 0),
				(string) ($std->pCOFINS ?? 0),
				self::fmt2($std->vCOFINS ?? 0),
			);
		}
		if ($grupo === 'qtde') {
			return sprintf(
				'<COFINS><COFINSQtde><CST>%s</CST><qBCProd>%s</qBCProd><vAliqProd>%s</vAliqProd><vCOFINS>%s</vCOFINS></COFINSQtde></COFINS>',
				$cst,
				(string) ($std->qBCProd ?? 0),
				(string) ($std->vAliqProd ?? 0),
				self::fmt2($std->vCOFINS ?? 0),
			);
		}
		if ($grupo === 'outr') {
			return sprintf(
				'<COFINS><COFINSOutr><CST>%s</CST><vBC>%s</vBC><pCOFINS>%s</pCOFINS><vCOFINS>%s</vCOFINS></COFINSOutr></COFINS>',
				$cst,
				self::fmt2($std->vBC ?? 0),
				(string) ($std->pCOFINS ?? 0),
				self::fmt2($std->vCOFINS ?? 0),
			);
		}

		return sprintf('<COFINS><COFINSNT><CST>%s</CST></COFINSNT></COFINS>', $cst);
	}

	private static function montar(
		int $nItem,
		mixed $cstBruto,
		mixed $aliquotaBruta,
		float $vProd,
		float $qCom,
		string $campoAliquota,
		string $campoValor,
	): object {
		$cst = self::normalizarCst($cstBruto);
		$grupo = $cst !== null ? self::resolverGrupo($cst) : null;
		if ($cst === null || $grupo === null) {
			$cst = self::CST_FALLBACK_NT;
			$grupo = 'nt';
		}

		$aliquota = is_numeric($aliquotaBruta) ? (float) $aliquotaBruta : 0.0;
		$vProd = round($vProd, 2);

		$dados = [
			'item' => $nItem,
			'CST' => $cst,
			'vBC' => 0.0,
			$campoAliquota => 0.0,
			$campoValor => 0.0,
		];

		if ($grupo === 'aliq') {
			$dados['vBC'] = $vProd;
			$dados[$campoAliquota] = round($aliquota, 4);
			$dados[$campoValor] = round($vProd * $aliquota / 100, 2);
		} elseif ($grupo === 'qtde') {
			$qCom = $qCom > 0 ? $qCom : 0.0;
			$dados['qBCProd'] = round($qCom, 4);
			$dados['vAliqProd'] = round($aliquota, 4);
			$dados[$campoValor] = round($qCom * $aliquota, 2);
		} elseif ($grupo === 'outr') {
			$dados['vBC'] = $vProd;
			$dados[$campoAliquota] = round($aliquota, 4);
			$dados[$campoValor] = round($vProd * $aliquota / 100, 2);
		}

		return (object) $dados;
	}

	private static function fmt2(mixed $valor): string
	{
		return number_format((float) $valor, 2, '.', '');
	}
}
