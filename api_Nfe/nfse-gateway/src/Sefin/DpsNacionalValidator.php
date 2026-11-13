<?php

declare(strict_types=1);

namespace MaisGestao\NfseGateway\Sefin;

/**
 * Validador preventivo da DPS no leiaute do Sistema Nacional NFS-e (Sefin / NT 009).
 * Inspirado em DpsValidator do pacote nfse-php.
 */
final class DpsNacionalValidator
{
    /**
     * Valida o payload antes da montagem do XML e retorna lista de erros.
     *
     * @param array<string, mixed> $payloadNfse
     * @param array<string, mixed> $configJson
     * @return list<string>
     */
    public static function validar(array $payloadNfse, array $configJson): array
    {
        $erros = [];

        $prestador = is_array($payloadNfse['prestador'] ?? null) ? $payloadNfse['prestador'] : [];
        $tomador = is_array($payloadNfse['tomador'] ?? null) ? $payloadNfse['tomador'] : [];
        $servico = is_array($payloadNfse['servico'] ?? null) ? $payloadNfse['servico'] : [];
        $valores = is_array($servico['valores'] ?? null) ? $servico['valores'] : [];

        $cnpjPrestador = preg_replace('/\D/', '', (string) ($prestador['cnpj'] ?? $configJson['cnpj'] ?? '')) ?? '';
        if (strlen($cnpjPrestador) !== 11 && strlen($cnpjPrestador) !== 14) {
            $erros[] = 'CPF/CNPJ do prestador é obrigatório e deve ter 11 ou 14 dígitos.';
        }

        $cLocEmi = preg_replace('/\D/', '', (string) ($prestador['municipioIbge'] ?? $configJson['codigomunicipioibge'] ?? '')) ?? '';
        if (!preg_match('/^\d{7}$/', $cLocEmi)) {
            $erros[] = 'Código IBGE do município emissor (cLocEmi) deve ter 7 dígitos numéricos.';
        }

        $docTomador = preg_replace('/\D/', '', (string) ($tomador['cnpjCpf'] ?? '')) ?? '';
        if ($docTomador !== '' && strlen($docTomador) !== 11 && strlen($docTomador) !== 14) {
            $erros[] = 'CPF/CNPJ do tomador deve ter 11 ou 14 dígitos quando informado.';
        }

        $vServ = (float) ($valores['servicos'] ?? 0);
        if ($vServ <= 0) {
            $erros[] = 'O valor do serviço (vServ) deve ser maior que zero.';
        }

        $cLocPrestacao = preg_replace('/\D/', '', (string) ($servico['codigoMunicipioIncidencia'] ?? $cLocEmi)) ?? '';
        if (!preg_match('/^\d{7}$/', $cLocPrestacao)) {
            $erros[] = 'Código IBGE do local da prestação (cLocPrestacao) deve ter 7 dígitos numéricos.';
        }

        $discriminacao = trim((string) ($servico['discriminacao'] ?? ''));
        if ($discriminacao === '') {
            $erros[] = 'A discriminação do serviço (xDescServ) é obrigatória.';
        }

        return $erros;
    }
}
