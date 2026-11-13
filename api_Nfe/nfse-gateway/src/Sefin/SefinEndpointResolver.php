<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Sefin;

/**
 * Resolve URLs base da Sefin Nacional, ADN, CNC e endpoints municipais específicos
 * aderentes ao layout nacional (inspirado em SefinEndpointResolver do nfse-php).
 */
final class SefinEndpointResolver
{
    public const SEFIN_PRODUCAO = 'https://sefin.nfse.gov.br/SefinNacional';
    public const SEFIN_HOMOLOGACAO = 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional';

    public const ADN_PRODUCAO = 'https://adn.nfse.gov.br';
    public const ADN_HOMOLOGACAO = 'https://adn.producaorestrita.nfse.gov.br';

    /**
     * Municípios com endpoints próprios publicados para o layout nacional.
     *
     * @var array<string, array{production: string, homologation: string}>
     */
    private const ENDPOINTS_MUNICIPAIS = [
        '3511102' => [
            'production' => 'https://cidadaoonline.catanduva.sp.gov.br/nota/nacional',
            'homologation' => 'https://catanduva.prefeitura.rlz.com.br/nota/nacional',
        ],
    ];

    /**
     * Hosts municipais cujo certificado TLS exige fixação de IP via CURLOPT_RESOLVE.
     *
     * @var array<string, string>
     */
    private const PINNED_HOSTS = [
        'cidadaoonline.catanduva.sp.gov.br:443' => '164.152.60.237',
    ];

    /**
     * Entradas no formato do CURLOPT_RESOLVE ("host:porta:ip").
     *
     * @return list<string>
     */
    public static function pinnedHosts(): array
    {
        $entries = [];
        foreach (self::PINNED_HOSTS as $hostPort => $ip) {
            $entries[] = $hostPort . ':' . $ip;
        }

        return $entries;
    }

    /**
     * Resolve a URL base de emissão/consulta da Sefin a partir da configuração.
     *
     * @param array<string, mixed> $configJson
     */
    public static function resolveSefinBaseUrl(array $configJson): string
    {
        $ambiente = (int) ($configJson['ambiente'] ?? 2);
        $urlOverride = trim((string) ($configJson['urlwsdl'] ?? ''));

        if ($urlOverride !== '' && !self::urlPareceWsdlLegado($urlOverride)) {
            return rtrim($urlOverride, '/');
        }

        $codigoMunicipio = preg_replace('/\D/', '', (string) ($configJson['codigomunicipioibge'] ?? '')) ?? '';
        if ($codigoMunicipio !== '' && isset(self::ENDPOINTS_MUNICIPAIS[$codigoMunicipio])) {
            $mapa = self::ENDPOINTS_MUNICIPAIS[$codigoMunicipio];

            return rtrim($ambiente === 1 ? $mapa['production'] : $mapa['homologation'], '/');
        }

        return $ambiente === 1 ? self::SEFIN_PRODUCAO : self::SEFIN_HOMOLOGACAO;
    }

    /**
     * Resolve a URL base do ADN (Ambiente de Dados Nacional) por ambiente.
     *
     * @param array<string, mixed> $configJson
     */
    public static function resolveAdnBaseUrl(array $configJson): string
    {
        $ambiente = (int) ($configJson['ambiente'] ?? 2);

        return $ambiente === 1 ? self::ADN_PRODUCAO : self::ADN_HOMOLOGACAO;
    }

    /**
     * Resolve o caminho ou URL completa para download do DANFSe PDF.
     *
     * @param array<string, mixed> $configJson
     */
    public static function resolveDanfsePathOrUrl(array $configJson, string $chaveAcesso): string
    {
        $codigoMunicipio = preg_replace('/\D/', '', (string) ($configJson['codigomunicipioibge'] ?? '')) ?? '';
        if ($codigoMunicipio !== '' && isset(self::ENDPOINTS_MUNICIPAIS[$codigoMunicipio])) {
            return rtrim(self::resolveSefinBaseUrl($configJson), '/') . '/danfse/' . $chaveAcesso . '/pdf';
        }

        return '/danfse/' . $chaveAcesso;
    }

    public static function urlPareceWsdlLegado(string $url): bool
    {
        $u = strtolower(trim($url));

        return str_ends_with($u, '.wsdl')
            || str_contains($u, '?wsdl')
            || str_contains($u, 'betha.cloud')
            || str_contains($u, 'betha.com.br');
    }
}
