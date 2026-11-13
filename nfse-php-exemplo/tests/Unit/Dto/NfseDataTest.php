<?php

use Nfse\Dto\Nfse\DpsData;
use Nfse\Dto\Nfse\EmitenteData;
use Nfse\Dto\Nfse\EnderecoEmitenteData;
use Nfse\Dto\Nfse\InfNfseData;
use Nfse\Dto\Nfse\NfseData;
use Nfse\Dto\Nfse\ValoresNfseData;
use Nfse\Support\IdGenerator;

it('can instantiate nfse data with full structure', function () {
    $dpsId = IdGenerator::generateDpsId('12345678000199', '1234567', '1', '100');

    $nfse = new NfseData([
        '@attributes' => ['versao' => '1.00'],
        'infNFSe' => [
            '@attributes' => ['Id' => 'NFS123456'],
            'nNFSe' => '100',
            'nDFSe' => '987654321',
            'cVerif' => 'ABCDEF',
            'dhProc' => '2023-01-01T12:00:00',
            'ambGer' => 2,
            'verAplic' => '1.0',
            'procEmi' => 1,
            'xLocEmi' => 'VARZEA ALEGRE',
            'xLocPrestacao' => 'VARZEA ALEGRE',
            'cLocIncid' => '2314003',
            'xLocIncid' => 'VARZEA ALEGRE',
            'xTribNac' => 'Enfermagem...',
            'xTribMun' => '04.06 - Enfermagem...',
            'xNBS' => '123456789',
            'tpEmis' => 1,
            'cStat' => 100,
            'xOutInf' => 'Informações adicionais',
            'DPS' => [
                '@attributes' => ['versao' => '1.00'],
                'infDPS' => [
                    '@attributes' => ['Id' => $dpsId],
                    'tpAmb' => 2,
                    'dhEmi' => '2023-01-01',
                    'verAplic' => '1.0',
                    'serie' => '1',
                    'nDPS' => '100',
                    'dCompet' => '2023-01-01',
                    'tpEmit' => 1,
                    'cLocEmi' => '1234567',
                    'cMotivoEmisTI' => null,
                    'chNFSeRej' => null,
                    'subst' => null,
                    'prest' => null,
                    'toma' => null,
                    'interm' => null,
                    'serv' => null,
                    'valores' => null,
                ],
            ],
            'emit' => [
                'CNPJ' => '12345678000199',
                'CPF' => null,
                'IM' => '12345',
                'xNome' => 'Prefeitura Municipal',
                'xFant' => 'Secretaria de Finanças',
                'enderNac' => [
                    'xLgr' => 'Praça da Sé',
                    'nro' => '1',
                    'xCpl' => null,
                    'xBairro' => 'Centro',
                    'cMun' => '3550308',
                    'UF' => 'SP',
                    'CEP' => '01001000',
                ],
                'fone' => '1112345678',
                'email' => 'contato@prefeitura.sp.gov.br',
            ],
            'valores' => [
                'vCalcDR' => 0.0,
                'tpBM' => 0,
                'vCalcBM' => 0.0,
                'vBC' => 1850.00,
                'pAliqAplic' => 5.00,
                'vISSQN' => 92.50,
                'vTotalRet' => 0.0,
                'vLiq' => 1757.50,
            ],
        ],
    ]);

    expect($nfse)->toBeInstanceOf(NfseData::class);
    expect($nfse->infNfse->numeroDfse)->toBe('987654321');
    expect($nfse->infNfse->localEmissao)->toBe('VARZEA ALEGRE');
    expect($nfse->infNfse->valores)->toBeInstanceOf(ValoresNfseData::class);
    expect($nfse->infNfse->valores->valorLiquido)->toBe(1757.50);

    expect($nfse->infNfse)->toBeInstanceOf(InfNfseData::class);
    expect($nfse->infNfse->emitente)->toBeInstanceOf(EmitenteData::class);
    expect($nfse->infNfse->emitente->endereco)->toBeInstanceOf(EnderecoEmitenteData::class);
    expect($nfse->infNfse->dps)->toBeInstanceOf(DpsData::class);
});

it('verifies DpsData is a DFe', function () {
    $dpsId = IdGenerator::generateDpsId('12345678000199', '1234567', '1', '100');

    $dps = new DpsData([
        '@attributes' => ['versao' => '1.00'],
        'infDPS' => [
            '@attributes' => ['Id' => $dpsId],
            'tpAmb' => 2,
            'dhEmi' => '2023-01-01',
            'verAplic' => '1.0',
            'serie' => '1',
            'nDPS' => '100',
            'dCompet' => '2023-01-01',
            'tpEmit' => 1,
            'cLocEmi' => '1234567',
            'cMotivoEmisTI' => null,
            'chNFSeRej' => null,
            'subst' => null,
            'prest' => null,
            'toma' => null,
            'interm' => null,
            'serv' => null,
            'valores' => null,
        ],
    ]);

    expect($dps)->toBeInstanceOf(DpsData::class);
});
